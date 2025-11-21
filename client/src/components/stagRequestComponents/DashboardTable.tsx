/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { ThemeProvider } from "@material-ui/core/styles";
import theme from "../assets/styles/theme";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  IconButton,
  Box,
  Tooltip,
  InputBase,
  AppBar,
  Toolbar,
  makeStyles,
} from "@material-ui/core";
import { Delete as DeleteIcon, Edit as EditIcon, Refresh as RefreshIcon } from "@material-ui/icons";
import { deleteStagRequest } from "../../hooks/stagRequestService";
import EditStagRequest from "./EditStagRequest";
import ModalContainer from "./ModalContainer";
import CarouselSlider from "./CarouselSlider";
import { Search as SearchIcon } from "@material-ui/icons";
import { Link } from 'react-router-dom';
import JiraStatusIndicator from './JiraStatusIndicator';

const columnNames = [
  "Title",
  "Description",
  "Requested By",
  "SOT Type",
  "Stag Variables",
  "Platform",
  "Comments",
  "Attachments",
  "Jira Ticket",
  "Status",
  "Actions",
];

const useStyles = makeStyles((theme: any) => ({
  search: {
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.common.white,
    "&:hover": {
      backgroundColor: theme.palette.common.white,
    },
    width: "100%",
  },
  searchIcon: {
    padding: theme.spacing(0, 0, 1, 1),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#000"
  },
  inputRoot: {
    width: "100%",
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 4),
    transition: theme.transitions.create("width"),
    width: "100%",
  },
  refreshButton: {
    marginLeft: theme.spacing(2),
  },
}));

const StyledTableCell = ({ children }) => (
  <TableCell>
    <TableSortLabel>
      <b>{children}</b>
    </TableSortLabel>
  </TableCell>
);

const initialModalState = {
  isOpen: false,
  content: null,
  text: "",
  title: "",
};

const EnhancedTable = ({ data, onDelete, onDataRefresh }) => {
  const classes = useStyles();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const TableHeader = () => {
    return (
      <>
        {columnNames.map((columnName, index) => (
          <StyledTableCell
            key={index}
            onClick={() => handleRequestSort(columnName.toLowerCase())}
          >
            {columnName}
          </StyledTableCell>
        ))}
      </>
    );
  };

  const handleRequestSort = (property) => {
    const isAsc = state.orderBy === property && state.order === "asc";
    setState((prevState) => ({
      ...prevState,
      order: isAsc ? "desc" : "asc",
      orderBy: property,
    }));
  };

  const [state, setState] = useState({
    order: "asc",
    orderBy: "id",
    modal: { ...initialModalState },
    selectedAttachments: [],
    attachmentsModalOpen: false,
  });

  const [searchQuery, setSearchQuery] = useState("");

  const handleDelete = (id: any) => {
    deleteStagRequest(id)
      .then((response) => {
        if (response?.success) {
          onDelete(response.success, id);
        }
      })
      .catch((error) => {
        console.error("Error deleting request:", error);
      });
  };

  const openModal = (text: string, title: string) => {
    setState((prevState: any) => ({
      ...prevState,
      modal: {
        isOpen: true,
        content: title,
        text,
        title,
      },
    }));
  };

  const onCloseModal = () => {
    setState((prevState) => ({
      ...prevState,
      modal: { ...initialModalState },
    }));
  };

  const handleEdit = (id) => {
    openModal(
      <EditStagRequest
        id={id}
        onClose={onCloseModal}
        onDataRefresh={onDataRefresh}
      />
    );
  };

  const handleAttachmentsClick = (attachments) => {
    if (attachments && attachments.length) {
      setState((prevState) => ({
        ...prevState,
        selectedAttachments: attachments,
        attachmentsModalOpen: true,
      }));
    }
  };

  const truncateText = (text, maxLength) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const handleLargeTextClick = (formField, data) => {
    openModal(data, formField);
  };

  const handleSotProperties = (data) => {
    if (data && data.length > 0) {
      const properties = typeof data === 'string' ? JSON.parse(data) : data;
      return properties.map((obj) => (
        <tr key={obj.tagKey}>
          <Tooltip title={obj.tagName} arrow>
            <td>{obj.tagKey}</td>
          </Tooltip>
          <td>:</td>
          <Tooltip title={obj.tagName} arrow>
            <td>{obj.tagName}</td>
          </Tooltip>
        </tr>
      ));
    } else {
      return (
        <tr key="no-stag-vars">
          <td colSpan="3">No Stag Variables Available.</td>
        </tr>
      );
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onDataRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredData = data.filter((item) =>
    Object.values(item)
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <Box width="98%" margin="0 auto">
      <ThemeProvider theme={theme}>
        <AppBar position="static">
          <Toolbar>
            <div className={classes.search}>
              <div className={classes.searchIcon}>
                <SearchIcon />
              </div>
              <InputBase
                placeholder="Search..."
                classes={{
                  root: classes.inputRoot,
                  input: classes.inputInput,
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Tooltip title="Refresh Jira Status">
              <IconButton
                color="inherit"
                className={classes.refreshButton}
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshIcon className={isRefreshing ? 'spin-animation' : ''} />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
      </ThemeProvider>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader />
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map(
              ({
                id,
                title,
                description,
                requestedBy,
                sotType,
                sotProperties,
                platform,
                comments,
                jiraTicket,
                jiraStatus,
                attachments,
              }) => (
                <TableRow key={id}>
                  <TableCell>{title}</TableCell>
                  <TableCell>
                    <span
                      onClick={() =>
                        handleLargeTextClick("Description", description)
                      }
                    >
                      {truncateText(description, 50)}
                      {description.length > 50 && (
                        <span style={{ color: "blue", cursor: "pointer" }}>
                          {" "}
                          (Show More)
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{requestedBy}</TableCell>
                  <TableCell>{sotType}</TableCell>
                  <TableCell>
                    <table>
                      <tbody>{handleSotProperties(sotProperties)}</tbody>
                    </table>
                  </TableCell>
                  <TableCell>
                    {Array.isArray(platform) ? platform.join(', ') : platform}
                  </TableCell>
                  <TableCell>
                    <span
                      onClick={() => handleLargeTextClick("Comments", comments)}
                    >
                      {truncateText(comments, 50)}
                      {comments.length > 50 && (
                        <span style={{ color: "blue", cursor: "pointer" }}>
                          {" "}
                          (Show More)
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        cursor: attachments?.length ? "pointer" : "",
                        color: "blue",
                      }}
                      onClick={() => handleAttachmentsClick(attachments)}
                    >
                      {attachments?.length
                        ? `${attachments.length} attachments`
                        : `No Attachments`}
                    </span>
                  </TableCell>
                  <TableCell>
                    {jiraTicket ? (
                      <Link to={jiraTicket} target="_blank">
                        View Jira Ticket
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <JiraStatusIndicator status={jiraStatus || 'To Do'} />
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <IconButton
                        color="secondary"
                        aria-label="edit"
                        onClick={() => handleEdit(id)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="secondary"
                        aria-label="delete"
                        onClick={() => handleDelete(id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <ModalContainer
        isOpen={state.modal.isOpen}
        onClose={onCloseModal}
        title={state.modal.title}
      >
        <div
          style={{
            padding:
              state.modal.title === "Description" ||
              state.modal.title === "Comments"
                ? "16px"
                : "0",
          }}
        >
          <strong>{state.modal.content}</strong>
          <p style={{ margin: "0" }}>{state.modal.text}</p>
        </div>
      </ModalContainer>
      <ModalContainer
        isOpen={state.attachmentsModalOpen}
        onClose={() =>
          setState((prevState) => ({
            ...prevState,
            attachmentsModalOpen: false,
          }))
        }
      >
        {state?.selectedAttachments?.length === 1 ? (
          <img
            src={state.selectedAttachments[0].src}
            alt="Attachment"
            style={{ width: "100%", marginBottom: "16px" }}
          />
        ) : (
          <CarouselSlider attachments={state.selectedAttachments} />
        )}
      </ModalContainer>
    </Box>
  );
};

export default EnhancedTable;