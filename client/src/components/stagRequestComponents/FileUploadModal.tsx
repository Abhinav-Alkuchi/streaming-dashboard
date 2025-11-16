import { useState, useCallback } from "react";
import Modal from "@mui/material/Modal";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import FileDropzone from "./FileDropzone";
import { Box } from "@mui/material";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "4px",
  overflow: "hidden",
  width: "50%",
  height: "auto",
};

const closeButtonStyle = {
  position: "absolute",
  top: "8px",
  right: "8px",
  cursor: "pointer",
};

const fileGridItemStyle = {
  backgroundColor: "#f0f0f0",
  padding: "10px",
  borderRadius: "4px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
  width: "auto",
};

const FileUploadModal = ({ isOpen, onRequestClose, onDrop }) => {
  const [files, setFiles] = useState([]);
  const [fileSizeError, setFileSizeError] = useState(false);

  const handleDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      if (file.size <= 5 * 1024 * 1024) {
        setFileSizeError(false);
        const reader = new FileReader();
  
        reader.onload = function (e) {
          const fileWithSrc = new File([file], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });
          fileWithSrc.src = e.target.result;
  
          setFiles((prevFiles) => [...prevFiles, fileWithSrc]);
        };
  
        reader.readAsDataURL(file);
      } else {
        setFileSizeError(true);
      }
    });
  }, []);

  const removeFile = (index) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    onDrop(updatedFiles);
  };

  const closeModal = async (e) => {
    e.preventDefault();
    setFiles([]);
    onRequestClose();
  };

  const uploadFiles = () => {
    if (files && files.length > 0) {
      onDrop(files);
      setFiles([]);
      onRequestClose();
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={closeModal}
      aria-labelledby="file-upload-modal"
    >
      <Box sx={modalStyle}>
        <CloseIcon sx={closeButtonStyle} onClick={closeModal} />
        <h2>File Upload</h2>
        <FileDropzone onDrop={handleDrop} fileSizeError={fileSizeError} />
        {fileSizeError && (
          <Typography variant="body2" color="error" sx={{ marginTop: "8px" }}>
            File size exceeds 5 MB limit
          </Typography>
        )}
        {files.length > 0 && (
          <Grid item xs={12} md={12}>
            <h3 style={{ marginTop: "20px" }}>Selected Files</h3>
            <Box
              sx={{
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {files.map((file, index) => (
                <Box key={file.name} sx={fileGridItemStyle}>
                  <span>{file.name}</span>
                  <IconButton onClick={() => removeFile(index)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Grid>
        )}
        <Button
          sx={{ marginTop: "20px" }}
          variant="contained"
          color="primary"
          onClick={uploadFiles}
        >
          Upload
        </Button>
      </Box>
    </Modal>
  );
};

export default FileUploadModal;