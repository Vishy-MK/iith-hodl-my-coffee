import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const uploadFolder = path.join(process.cwd(), 'pdf_uploads');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const files = fs.readdirSync(uploadFolder).filter((file) => file.endsWith('.pdf'));
    if (files.length === 0) {
      return res.status(400).json({ error: 'No PDF files found in the upload folder.' });
    }

    // Simulate file upload logic
    const uploadedFiles = files.map((file) => ({ name: file }));

    return res.status(200).json({ message: 'Files uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('Error reading upload folder:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}