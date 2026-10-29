

const ngoMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== "ngo") { 
        return res.status(403).json({ message: "Access denied. NGO role required." });
    }
    next();
};

module.exports = ngoMiddleware;