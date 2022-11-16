import { Router } from 'express';
import * as controller from '../controllers/other.js';

const router = Router();

router.get('/metals', controller.getMetalGroups);
router.get('/categories', controller.getCategories);
router.get('/varieties', controller.getVarieties);
router.get('/items', controller.getItems);
router.get('/sliders', controller.getSliders);
router.get('/offers', controller.getOffers);
router.get('/faqs', controller.getFaqs);
router.get('/policies', controller.getPolicies);
router.get('/interests', controller.getInterests);
router.get('/videos', controller.getVideos);
router.get('/reasons', controller.getReasons);
router.get('/brands', controller.getBrands);
router.get('/banners', controller.getBrands);

export default router;
