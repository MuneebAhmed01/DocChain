import express from 'express';
import * as blogController from '../controllers/blogController.js';
import authAdmin from "../middlewares/authAdmin.js";


const router = express.Router();

router.get('/', blogController.getBlogs);
router.get('/:idOrSlug', blogController.getBlogById);

// protected routes for admin
router.post('/', authAdmin, blogController.createBlog);
router.put('/:id', authAdmin, blogController.updateBlog);
router.delete('/:id', authAdmin, blogController.deleteBlog);

export default router;
