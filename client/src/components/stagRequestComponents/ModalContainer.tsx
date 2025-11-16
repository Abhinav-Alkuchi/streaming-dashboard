import Modal from "@mui/material/Modal";
import CloseIcon from "@mui/icons-material/Close";
import { Box } from "@mui/material";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "70%",
  backgroundColor: "background.paper",
  border: "1px solid #fff",
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
  color: "#000",
  backgroundColor: "background.paper",
  borderRadius: "50%"
};

const ModalContainer = ({ isOpen, onClose, children }) => {
  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box sx={modalStyle}>
        <CloseIcon sx={closeButtonStyle} onClick={onClose} />
        {children}
      </Box>
    </Modal>
  );
};

export default ModalContainer;