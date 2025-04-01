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
      return {
        folder: 'EditEdgeCRM',
        resource_type: 'auto',
        allowed_formats: ['jpeg', 'png', 'jpg', 'pdf', 'doc', 'docx', 'txt', 'xlsx', 'xls', 'ppt', 'pptx'],
        public_id: file.originalname.split('.')[0], // ✅ Now works correctly
      };
    },
  });
  

module.exports = {
    cloudinary,
    storage
}