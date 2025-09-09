const express = require('express');
const admin = require('firebase-admin');
const verifyToken = require('../middleware/auth');
const router = express.Router();
const db = admin.firestore();

// POST /api/upload-metadata
router.post('/upload-metadata', verifyToken, async (req, res) => {
  const { originalImageURL, croppedImageURL, timestamp } = req.body;
  const userId = req.user.uid;

  if (!originalImageURL || !croppedImageURL || !timestamp) {
    return res.status(400).send('Missing required metadata');
  }

  try {
    const docRef = await db.collection('images').add({
      userId,
      originalImageURL,
      croppedImageURL,
      timestamp,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(201).send({ message: 'Metadata saved', id: docRef.id });
  } catch (error) {
    console.error('Error saving metadata:', error);
    res.status(500).send('Failed to save metadata');
  }
});

// GET /api/images
router.get('/images', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const imagesRef = db.collection('images').where('userId', '==', userId).orderBy('timestamp', 'desc');
    const snapshot = await imagesRef.get();

    const images = snapshot.empty ? [] : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).send('Failed to fetch images');
  }
});

module.exports = router;
