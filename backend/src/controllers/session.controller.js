
function getCurrentUserController(req, res) {
    const user = req.user;

    return res.status(200).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role || 'user'
        }
    });
}

module.exports = {
    getCurrentUserController
};
