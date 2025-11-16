import React from "react";
import Dropzone from "react-dropzone";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const FileDropzone = ({ onDrop, fileSizeError }) => {
  const dropzoneStyles = {
    width: "100%",
    height: "100px",
    border: "2px dashed #ccc",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <Dropzone onDrop={onDrop} maxFiles={5}>
      {({ getRootProps, getInputProps }) => (
        <form method="POST" encType="multipart/form-data">
          <div {...getRootProps()} style={dropzoneStyles}>
            <input {...getInputProps()} />
            <CloudUploadIcon
              style={{ padding: "5px", fontSize: 50, color: "#27272a" }}
            />
            <p>Drag 'n' drop some files here, or click to select files</p>
          </div>
        </form>
      )}
    </Dropzone>
  );
};

export default FileDropzone;
