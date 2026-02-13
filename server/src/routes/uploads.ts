import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import db from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '../../uploads');

// Ensure upload directories exist
['images', 'documents'].forEach((dir) => {
  const dirPath = join(uploadsDir, dir);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const subDir = isImage ? 'images' : 'documents';
    cb(null, join(uploadsDir, subDir));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const router = Router();

// Upload file
router.post('/', authMiddleware, upload.single('file'), (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      });
    }

    const { taskId, commentId } = req.body;

    const isImage = req.file.mimetype.startsWith('image/');
    const relativePath = isImage
      ? `images/${req.file.filename}`
      : `documents/${req.file.filename}`;

    const attachmentId = uuidv4();

    db.prepare(`
      INSERT INTO attachments (id, task_id, comment_id, uploader_id, file_name, file_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      attachmentId,
      taskId || null,
      commentId || null,
      req.user!.id,
      req.file.originalname,
      relativePath,
      req.file.size,
      req.file.mimetype
    );

    res.status(201).json({
      success: true,
      data: {
        id: attachmentId,
        taskId,
        commentId,
        uploaderId: req.user!.id,
        fileName: req.file.originalname,
        filePath: `/uploads/${relativePath}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Failed to upload file',
      },
    });
  }
});

// Get file
router.get('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as any;

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
        },
      });
    }

    const fullPath = join(uploadsDir, attachment.file_path);

    if (!existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found on disk',
        },
      });
    }

    res.download(fullPath, attachment.file_name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: 'Failed to download file',
      },
    });
  }
});

// Delete file
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as any;

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
        },
      });
    }

    // Only allow uploader or admin to delete
    if (attachment.uploader_id !== req.user!.id && !req.user!.permissions.canDeleteTask) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own uploads',
        },
      });
    }

    db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);

    // Note: In production, you might want to also delete the file from disk
    // or implement a cleanup job

    res.json({
      success: true,
      data: { message: 'Attachment deleted' },
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ATTACHMENT_ERROR',
        message: 'Failed to delete attachment',
      },
    });
  }
});

export default router;
