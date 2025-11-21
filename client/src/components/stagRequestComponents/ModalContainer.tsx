import Modal from "@mui/material/Modal";
import IconButton from "@mui/material/IconButton";
import { X } from "lucide-react";
import { Box } from "@mui/material";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "70%",
  backgroundColor: "#1F2937",
  border: "1px solid #1F2937",
  boxShadow: 24,
  borderRadius: 1,
  p: 4,
};

const closeButtonStyle = {
  position: "absolute",
  top: 8,
  right: 8,
  cursor: "pointer",
  zIndex: 99999,
  borderRadius: "50%",
  color: "#9CA3AF",
};

const ModalContainer = ({ isOpen, onClose, children }) => {
  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box sx={modalStyle}>
        <IconButton
            onClick={onClose}
            sx={{
              ...closeButtonStyle,
              "&:hover": {
                color: "#06B6D4",
                bgcolor: "rgba(6,182,212,0.1)"
              }
            }}
          >
            <X size={20} />
          </IconButton>
        {children}
      </Box>
    </Modal>
  );
};

export default ModalContainer;