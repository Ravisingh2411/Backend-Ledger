const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const sessionController = require('../controllers/session.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

/* POST /api/auth/register */
router.post('/register', authController.userRegisterController);

/* POST /api/auth/login */
router.post('/login', authController.userLoginController);

/* GET /api/auth/me */
router.get(
    '/me',
    authMiddleware,
    sessionController.getCurrentUserController
);

/* POST /api/auth/logout */
router.post('/logout', authController.userLogoutController);

module.exports = router;