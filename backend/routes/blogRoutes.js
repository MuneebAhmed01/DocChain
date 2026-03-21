import express from 'express';
import * as blogController from '../controllers/blogController.js';
import authAdmin from "../middlewares/authAdmin.js";
import authDoctor from "../middlewares/authDoctor.js";


const router = express.Router();

// protected routes for admin
router.get('/admin/all', authAdmin, blogController.getAllBlogsAdmin);
router.get('/admin/pending', authAdmin, blogController.getPendingBlogsAdmin);
router.get('/admin/:id', authAdmin, blogController.getBlogByIdAdmin);
router.post('/', authAdmin, blogController.createBlog);
router.put('/admin/:id', authAdmin, blogController.updateBlog);
router.patch('/admin/:id/status', authAdmin, blogController.updateBlogStatus);
router.delete('/admin/:id', authAdmin, blogController.deleteBlog);

// doctor submission route
router.post('/doctor', authDoctor, blogController.createDoctorBlog);

// public routes
router.get('/', blogController.getBlogs);
router.get('/:idOrSlug', blogController.getBlogById);

export default router;
