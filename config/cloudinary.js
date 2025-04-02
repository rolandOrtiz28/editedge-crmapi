require("dotenv").config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
})

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const extension = file.originalname.split('.').pop(); // Get extension
      const filename = file.originalname.replace(/\.[^/.]+$/, ''); // Strip extension for clean name
      return {
        folder: 'EditEdgeCRM',
        resource_type: 'auto',
        allowed_formats: ['jpeg', 'png', 'jpg', 'pdf', 'doc', 'docx', 'txt', 'xlsx', 'xls', 'ppt', 'pptx'],
        public_id: `${filename}-${Date.now()}.${extension}` // ✅ Unique & preserves extension
      };
    }
    
  });
  

module.exports = {
    cloudinary,
    storage
}