import { useState, useEffect } from 'react';
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CarouselSlider from "./CarouselSlider";
import ModalContainer from "./ModalContainer";
import { Box } from "@mui/material";

const thumbnailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
  gap: "10px",
  marginTop: "10px",
};

const thumbnailContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  borderRadius: "4px",
  marginBottom: "10px",
  border: "1px solid #d3d3d3",
  position: "relative",
};

const thumbnailStyles = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "flex",
  alignItems: "center",
};

const deleteIconStyle = {
  margin: "5px",
  color: "error.main",
  cursor: "pointer",
  backgroundColor: "#fff",
  position: "absolute",
};

const thumbnailWrapperStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  cursor: "pointer",
};

const fileIconStyle = {
  fontSize: 48,
  color: "primary.main",
};

const FilesThumbnails = ({ label, initialData, onUpdateFiles }) => {
  const [state, setState] = useState({
    selectedImageIndex: null,
    attachmentsModalOpen: false,
    files: initialData,
  });

  const handleAttachmentsClick = (attachments, index) => {
    if (attachments && attachments.length > 0) {
      setState((prevState) => ({
        ...prevState,
        selectedImageIndex: index,
        attachmentsModalOpen: true,
      }));
    }
  };

  const removeFile = (index) => {
    setState((prevState) => {
      const updatedFiles = [...prevState.files];
      updatedFiles.splice(index, 1);
      return { ...prevState, files: updatedFiles };
    });
  };

  useEffect(() => {
    onUpdateFiles(state.files);
  }, [state.files, onUpdateFiles]);

  return (
    <>
      {state.files.length > 0 && (
        <>
          <Grid item xs={12} md={12}>
            <h3 style={{ marginTop: "20px" }}>{label}</h3>
            <Box sx={thumbnailGridStyle}>
              {state.files.map((file, index) => (
                <Box key={index} sx={thumbnailContainerStyle}>
                  <Box
                    sx={thumbnailWrapperStyle}
                    onClick={() => handleAttachmentsClick(state.files, index)}
                  >
                    {file.type.startsWith("image/") ? (
                      <img
                        src={file.src}
                        alt={file.name}
                        style={thumbnailStyles}
                      />
                    ) : file.type === "application/pdf" ? (
                      <PictureAsPdfIcon sx={fileIconStyle} />
                    ) : (
                      <InsertDriveFileIcon sx={fileIconStyle} />
                    )}
                  </Box>
                  <IconButton
                    onClick={() => removeFile(index)}
                    sx={deleteIconStyle}
                  >
                    <DeleteIcon color="error" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Grid>
          <ModalContainer
            isOpen={state.attachmentsModalOpen}
            onClose={() => {
              setState((prevState) => ({
                ...prevState,
                attachmentsModalOpen: false,
                selectedImageIndex: null,
              }));
            }}
          >
            {state.files.length === 1 ? (
              <img
                src={state.files[0].src}
                alt="Attachment"
                style={{ width: "100%", marginBottom: "16px" }}
              />
            ) : (
              <CarouselSlider
                attachments={state.files}
                selectedIndex={state.selectedImageIndex}
              />
            )}
          </ModalContainer>
        </>
      )}
    </>
  );
};

export default FilesThumbnails;