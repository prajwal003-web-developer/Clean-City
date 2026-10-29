const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
    {
        path: {
            type: String,
            required: [true, "File path is required"],
        },
        fileID: {
            type: String,
            required: [true, "fileID  is required"],
        },
    },
    { timestamps: true }
);

const File = mongoose.model("File", fileSchema);

module.exports = File;      