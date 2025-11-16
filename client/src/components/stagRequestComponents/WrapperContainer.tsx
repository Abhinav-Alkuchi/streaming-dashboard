// WrapperComponent.jsx

import React, { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import { getAllStagRequests } from "../features/apiCalls";
import { makeStyles } from "@mui/styles";
import ModalContainer from "./ModalContainer";
import AddStagRequest from "./AddStagRequest";
import LoadingSpinner from "./LoadingSpinner";
import DashboardTable from "./DashboardTable";
import CustomSnackbarComponent from "./CustomSnackbarComponent";

const useStyles = makeStyles((theme) => ({
  linkButton: {
    textDecoration: "none",
    color: theme.palette.primary.main,
    textTransform: "capitalize",
  },
  buttonBox: {
    margin: "10px",
    marginLeft: "auto",
  },
  buttonText: {
    textTransform: "capitalize",
    margin: "0",
  },
}));

const initialModalState = {
  isOpen: false,
  content: null,
};

const initialApiState = {
  data: [],
  loading: true,
};

const WrapperContainer = () => {
  const [modal, setModal] = useState(initialModalState);
  const [api, setApi] = useState(initialApiState);
  const classes = useStyles();

  const fetchData = async () => {
    try {
      setApi((prevApi) => ({ ...prevApi, loading: true }));
      const response = await getAllStagRequests();
      setApi((prevApi) => ({ ...prevApi, data: response || [] }));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setApi((prevApi) => ({ ...prevApi, loading: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Initial data fetch

  const refreshData = (status, id) => {
    if (status) {
      setApi((prevApi) => ({
        ...prevApi,
        data: prevApi?.data?.filter((val) => val.id !== id),
      }));
    }
  };

  const openModal = (content) => {
    setModal({ isOpen: true, content });
  };

  const onCloseModal = () => {
    setModal(initialModalState);
  };

  const [snackBarState, setSnackBarState] = useState({
    open: false,
    vertical: 'top',
    horizontal: 'right',
    message: '',
    severity: 'success',
    autoHideDuration: 2000, // Adjust the duration as needed
  });

  const handleSnackbarClose = () => {
    setSnackBarState((prevState) => ({ ...prevState, open: false }));
  };

  const showSnackBar = (message, severity) => {
    setSnackBarState({
      open: true,
      vertical: 'top',
      horizontal: 'right',
      message,
      severity,
      autoHideDuration: 2000,
    });
    return (
      <CustomSnackbarComponent
      open={snackBarState.open}
      onClose={handleSnackbarClose}
      message={message}
      severity={severity}
      autoHideDuration={snackBarState.autoHideDuration}
    />
    )
  }

  return (
    <div>
      <Box display="flex" alignItems="center">
        <div className={classes.buttonBox}>
          <Button
            className={classes.linkButton}
            startIcon={<AddIcon />}
            onClick={() =>
              openModal(
                <AddStagRequest
                  onClose={onCloseModal}
                  onDataRefresh={fetchData}
                  showSnackBar={showSnackBar}
                />
              )
            }
          >
            <p className={classes.buttonText}>Add New Request</p>
          </Button>
        </div>
      </Box>
      <ModalContainer isOpen={modal.isOpen} onClose={onCloseModal}>
        {modal.content}
      </ModalContainer>
      {api.loading && <LoadingSpinner />}
      <DashboardTable
        onDataRefresh={fetchData}
        onModalOpen={openModal}
        data={api.data}
        onDelete={refreshData}
      />
    </div>
  );
};

export default WrapperContainer;
