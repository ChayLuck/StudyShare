import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        note: {
          select: {
            id: true,
            courseName: true,
            schoolName: true,
            description: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            userId: true,
            isHidden: true,
            needsReview: true,
            isVerified: true,
            isPrivate: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllRead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const markOneRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const notificationId = req.params.id as string;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('markOneRead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
