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
  backgroundColor: "#1F2937",
  padding: "20px",
  borderRadius: "4px",
  overflow: "hidden",
  width: "50%",
  height: "auto",
  border: "none",
  outline: "none"
};

const closeButtonStyle = {
  position: "absolute",
  top: "8px",
  right: "8px",
  cursor: "pointer",
  color: "#9CA3AF",
  "&:hover": {
    color: "#06B6D4"
  }
};

const fileGridItemStyle = {
  backgroundColor: "#374151",
  padding: "10px",
  borderRadius: "4px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
  width: "auto",
  color: "white"
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
  };

  const closeModal = async (e) => {
    e.preventDefault();
    setFiles([]);
    setFileSizeError(false);
    onRequestClose();
  };

  const uploadFiles = () => {
    if (files && files.length > 0) {
      onDrop(files);
      setFiles([]);
      setFileSizeError(false);
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
        <IconButton sx={closeButtonStyle} onClick={closeModal}>
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" sx={{ color: "white", mb: 2 }}>
          File Upload
        </Typography>
        <FileDropzone onDrop={handleDrop} fileSizeError={fileSizeError} />
        {fileSizeError && (
          <Typography variant="body2" color="error" sx={{ marginTop: "8px" }}>
            File size exceeds 5 MB limit
          </Typography>
        )}
        {files.length > 0 && (
          <Grid item xs={12} md={12}>
            <Typography variant="h6" sx={{ color: "white", marginTop: "20px", marginBottom: "10px" }}>
              Selected Files ({files.length})
            </Typography>
            <Box
              sx={{
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {files.map((file, index) => (
                <Box key={file.name} sx={fileGridItemStyle}>
                  <Typography variant="body2" sx={{ color: "white" }}>
                    {file.name}
                  </Typography>
                  <IconButton onClick={() => removeFile(index)} size="small">
                    <DeleteIcon color="error" fontSize="small" />
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
          disabled={files.length === 0}
        >
          Upload {files.length > 0 ? `(${files.length})` : ''}
        </Button>
      </Box>
    </Modal>
  );
};

export default FileUploadModal;