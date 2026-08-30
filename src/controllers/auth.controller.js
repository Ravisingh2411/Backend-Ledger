const userModel = require('../models/user.model');
const authModel = require('../models/user.model');
const emailService = require('../services/email.service');
const tokenBlackListModel = require("../models/blackList.model")
const jwt = require('jsonwebtoken');

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res){
    const {email, password, name} = req.body;
    
    const isUserExists = await userModel.findOne({email});
    if(isUserExists){
        return res.status(422).json({
            message: "User already exists with email",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"});
    res.cookie("token", token);

    res.status(201).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        },
        token
    })

    await emailService.sendRegistrationEmail(user.email, user.name);
} 


/**
* - user login controller
* - POST /api/auth/login
*/
async function userLoginController(req, res){
    const {email, password} = req.body;

    const user = await userModel.findOne({email}).select("+password");
    if(!user){
        return res.status(401).json({
            message: "Email or password is Invalid "
        })
    }

    const isValidPassword = await user.comparePassword(password);
    if(!isValidPassword){
        return res.status(401).json({
            message: "Email or password is Invalid "
        })
    }

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"});
    res.cookie("token", token);

    res.status(200).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        },
        token
    })
}


/**
 * - user logout controller
 * - POST /api/auth/logout
*/
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]
    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }

    await tokenBlackListModel.create({
        token: token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}