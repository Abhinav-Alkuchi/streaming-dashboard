import React, { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  TextField,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Popper,
  Paper,
  Alert,
  Collapse,
  IconButton,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import { RefreshCw, Upload, X } from "lucide-react";

import tagData from "./data/sotProps.json";
import fieldNames from "./data/requestFormFields.json";
import jiraPostRequest from "./data/jiraPostRequest.json";
import {
  createStagRequest,
  createJiraTicket,
  updateStagRequest,
  updateJiraTicket,
} from "../../hooks/stagRequestService";
import FileUploadModal from "./FileUploadModal";
import FilesThumbnails from "./FilesThumbnails";

// Types
interface TagOption {
  tagKey: string;
  tagName: string;
}

interface FieldName {
  fieldKey: string;
  fieldLabel: string;
  required?: boolean;
  fieldType?: string;
  autocomplete?: boolean;
  options?: TagOption[];
}

interface JiraAttachment {
  id: string;
  issueKey: string;
  imageUrl: string;
  imageThumbnail: string;
  filename: string;
  mimeType: string;
  size: number;
  created: string;
  self: string;
  isJiraAttachment?: boolean;
}

interface FormData {
  [key: string]: any;
  platform?: string[];
  attachments?: (File | JiraAttachment)[];
  requestId?: string;
  jiraTicket?: string;
  title?: string;
  description?: string;
  comments?: string;
  sotType?: string;
  sotProperties?: TagOption[];
}

interface JiraResponse {
  success: boolean;
  message?: string;
  issueKey: string;
}

interface StagResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    timestamp?: string;
  };
}

interface EditData {
  id: string;
  title?: string;
  description?: string;
  comments?: string;
  sotType?: string;
  platform?: string | string[];
  sotProperties?: any[];
  jiraTicket?: string;
  attachments?: any[];
  [key: string]: any;
}

// Custom Popper
const CustomPopper = (props: any) => (
  <Popper
    {...props}
    style={{ ...props.style, zIndex: 1300 }}
    placement="bottom-start"
  />
);

// Main Component
const AddStagRequest: React.FC<{
  onClose: () => void;
  onDataRefresh: () => void;
  showSnackBar: (msg: string, severity: "success" | "error") => void;
  editData?: EditData | null;
}> = ({ onClose, onDataRefresh, showSnackBar, editData }) => {
  const isEditMode = !!editData;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormData>({
    defaultValues: isEditMode
      ? {
          title: editData.title || "",
          description: editData.description || "",
          comments: editData.comments || "",
          sotType: editData.sotType || "",
          platform: Array.isArray(editData.platform)
            ? editData.platform
            : editData.platform
            ? [editData.platform]
            : [],
          sotProperties: editData.sotProperties || [],
        }
      : {},
  });

  const [files, setFiles] = useState<File[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<JiraAttachment[]>([]);

  // Helper function to upload attachments to Jira and get URLs
  const uploadAttachmentsToJira = async (issueKey: string, files: File[]): Promise<{success: boolean; attachments?: JiraAttachment[]; message?: string}> => {
    if (!files || files.length === 0) return { success: true, attachments: [] };

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("file", file);
      });
      formData.append("ticket", issueKey);

      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
      const response = await fetch(
        `${baseUrl}/api/stagRequests/uploadAttachments`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload attachments to Jira");
      }

      const result = await response.json();
      console.log("Attachments uploaded successfully:", result);
      return result;
    } catch (error: any) {
      console.error("Error uploading attachments:", error);
      throw error;
    }
  };

  // Load edit data when component mounts in edit mode
  useEffect(() => {
    if (isEditMode && editData) {
      const platformArray = Array.isArray(editData.platform)
        ? editData.platform
        : editData.platform
        ? [editData.platform]
        : [];

      setValue("title", editData.title || "");
      setValue("description", editData.description || "");
      setValue("comments", editData.comments || "");
      setValue("sotType", editData.sotType || "");
      setValue("platform", platformArray);
      setValue("sotProperties", editData.sotProperties || []);

      // Load existing Jira attachments
      if (editData.attachments && Array.isArray(editData.attachments)) {
        const jiraAttachments: JiraAttachment[] = editData.attachments
          .filter(att => att.isJiraAttachment || att.imageUrl)
          .map(att => ({
            id: att.id,
            issueKey: att.issueKey,
            imageUrl: att.imageUrl,
            imageThumbnail: att.imageThumbnail || att.imageUrl,
            filename: att.filename || att.name,
            mimeType: att.mimeType || att.type,
            size: att.size,
            created: att.created,
            self: att.self,
            isJiraAttachment: true
          }));
        setExistingAttachments(jiraAttachments);
        console.log("Loaded existing Jira attachments:", jiraAttachments);
      }
    }
  }, [editData, isEditMode, setValue]);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const handleDrop = (accepted: File[]) => {
    if (accepted?.length) setFiles((prev) => [...prev, ...accepted]);
  };

  const updateFiles = (newFiles: File[]) => setFiles(newFiles);

  // Form Submission
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    console.log("Starting form submission...", { isEditMode, data });

    try {
      const sotProperties = data.sotProperties || [];

      // Validate required fields
      const missing = fieldNames
        .filter((f): f is FieldName & { required: true } => !!f.required)
        .some((f) => {
          const fieldKey = f.fieldKey;

          if (fieldKey === "platform") {
            return !data.platform || data.platform.length === 0;
          }

          if (fieldKey.startsWith("sotProperties")) {
            return sotProperties.length === 0;
          }

          const val = data[fieldKey];
          return !val || (typeof val === "string" && !val.trim());
        });

      if (missing) {
        showSnackBar("Please fill all required fields.", "error");
        setIsLoading(false);
        return;
      }

      // Prepare payload - use Jira attachments format
      const payload: any = {
        title: data.title || "",
        description: data.description || "",
        comments: data.comments || "",
        sotType: data.sotType || "",
        platform: data.platform || [],
        sotProperties: sotProperties,
        requestedBy: data.requestedBy,
        attachments: existingAttachments, // Start with existing Jira attachments
      };

      console.log("Prepared payload with Jira attachments:", payload);
      const platformsString = Array.isArray(payload.platform)
        ? payload.platform.join(", ")
        : payload.platform;

      if (isEditMode && editData) {
        // UPDATE MODE
        console.log("Updating existing request:", editData.id);

        // Extract issue key from Jira ticket URL
        let issueKey = "";
        if (editData.jiraTicket) {
          const match = editData.jiraTicket.match(/browse\/([A-Z]+-\d+)/);
          if (match) {
            issueKey = match[1];
          }
        }

        // Upload new attachments to Jira if any and get URLs
        if (issueKey && files.length > 0) {
          try {
            const uploadResult = await uploadAttachmentsToJira(issueKey, files);
            console.log("New attachments uploaded to Jira:", uploadResult);
            
            if (uploadResult.attachments) {
              // Add new Jira attachments to existing ones
              payload.attachments = [
                ...(payload.attachments || []),
                ...uploadResult.attachments
              ];
            }
          } catch (uploadError: any) {
            console.error("Error uploading attachments to Jira:", uploadError);
            showSnackBar(
              `Warning: Attachments upload failed - ${uploadError.message}`,
              "error"
            );
            // Continue with update even if attachment upload fails
          }
        }

        // Update Jira ticket description
        if (issueKey) {
          try {
            const jiraUpdateBody = {
              fields: {
                summary: payload.title || "Stag Event Request",
                description: `AC:\r\n${
                  payload.description || ""
                }\r\n\r\nPlatform: ${platformsString}\r\n\r\nRequired response from UFE:\r\n{code:java}${formatSotVariables(
                  payload.sotType,
                  sotProperties
                )}{code}\r\n\r\nComments: ${payload.comments || ""}`,
              },
            };

            console.log("Updating Jira ticket:", issueKey, jiraUpdateBody);
            const jiraUpdateRes = await updateJiraTicket(
              issueKey,
              jiraUpdateBody
            );

            if (jiraUpdateRes.success) {
              console.log("Jira ticket updated successfully");
            } else {
              throw new Error(jiraUpdateRes.message || "Jira update failed");
            }
          } catch (jiraError: any) {
            console.error("Jira update error:", jiraError);
            showSnackBar(
              `Warning: Jira update failed - ${jiraError.message}`,
              "error"
            );
          }
        }

        // Update in database
        payload.jiraTicket = editData.jiraTicket;
        payload.id = editData.id;

        const stagRes: StagResponse = await updateStagRequest(
          editData.id,
          payload
        );
        console.log("Update response:", stagRes);

        if (!stagRes?.success) {
          throw new Error(stagRes?.message || "Failed to update request");
        }

        const updatedRequestData = {
          ...payload,
          id: editData.id,
          jiraTicket: editData.jiraTicket,
          issueKey: issueKey,
          status: "updated",
          timestamp: new Date().toISOString(),
        };

        console.log("Update successful:", updatedRequestData);

        setSubmittedData(updatedRequestData);
        setShowSuccess(true);

        setTimeout(() => {
          onDataRefresh();
          showSnackBar("Request updated successfully!", "success");
        }, 1000);
      } else {
        // CREATE MODE
        console.log("Creating new Jira ticket...");

        const jiraBody = {
          fields: {
            ...jiraPostRequest,
            summary: payload.title || "Stag Event Request",
            description: `AC:\r\n${
              payload.description || ""
            }\r\n\r\nPlatform: ${platformsString}\r\n\r\nRequired response from UFE:\r\n{code:java}${formatSotVariables(
              payload.sotType,
              sotProperties
            )}{code}\r\n\r\nComments: ${payload.comments || ""}`,
          },
        };

        console.log("Jira request body:", jiraBody);

        let jiraTicketUrl = "";
        let issueKey = "";

        try {
          const jiraRes: JiraResponse = await createJiraTicket(jiraBody);
          console.log("Jira response:", jiraRes);

          if (!jiraRes?.success) {
            throw new Error(
              jiraRes?.message || "Jira API returned unsuccessful response"
            );
          }

          if (!jiraRes?.issueKey) {
            throw new Error("Jira response missing issueKey");
          }

          issueKey = jiraRes.issueKey;
          jiraTicketUrl = `https://jira.sephora.com/browse/${issueKey}`;

          console.log("Jira ticket created successfully:", issueKey);
        } catch (jiraError: any) {
          console.error("Jira ticket creation error:", jiraError);

          if (jiraError.message?.includes("fetch")) {
            throw new Error(
              "Unable to connect to Jira. Please check your network connection."
            );
          } else if (
            jiraError.message?.includes("401") ||
            jiraError.message?.includes("403")
          ) {
            throw new Error(
              "Jira authentication failed. Please check your credentials."
            );
          } else {
            throw new Error(
              `Jira ticket creation failed: ${jiraError.message}`
            );
          }
        }

        // Upload attachments to Jira after ticket creation and get URLs
        if (issueKey && files.length > 0) {
          try {
            const uploadResult = await uploadAttachmentsToJira(issueKey, files);
            console.log("Attachments uploaded to Jira:", uploadResult);
            
            if (uploadResult.attachments) {
              payload.attachments = uploadResult.attachments;
            }
          } catch (uploadError: any) {
            console.error("Error uploading attachments to Jira:", uploadError);
            showSnackBar(
              `Warning: Attachments upload failed - ${uploadError.message}`,
              "error"
            );
            // Continue with request creation even if attachment upload fails
          }
        }

        payload.jiraTicket = jiraTicketUrl;
        payload.jiraStatus = "Open";

        console.log("Creating Stag request with payload:", payload);

        let stagRes: StagResponse;
        try {
          stagRes = await createStagRequest(payload);
          console.log("Stag request response:", stagRes);

          if (!stagRes?.success) {
            throw new Error(
              stagRes?.message ||
                "Stag request API returned unsuccessful response"
            );
          }
        } catch (stagError: any) {
          console.error("Stag request creation error:", stagError);
          throw new Error(`Failed to save request: ${stagError.message}`);
        }

        const submittedRequestData = {
          ...payload,
          jiraTicket: jiraTicketUrl,
          status: "submitted",
          issueKey: issueKey,
          id: stagRes.data?.id,
          timestamp: stagRes.data?.timestamp || new Date().toISOString(),
        };

        console.log("Submission successful:", submittedRequestData);

        setSubmittedData(submittedRequestData);
        setShowSuccess(true);

        setTimeout(() => {
          onDataRefresh();
          showSnackBar("Request submitted successfully!", "success");
        }, 1000);
      }

      // Reset form
      reset();
      setFiles([]);
      setExistingAttachments([]);
    } catch (err: any) {
      console.error("Submission error:", err);

      let errorMessage = isEditMode
        ? "Update failed. Please try again."
        : "Submission failed. Please try again.";

      if (err.message) {
        errorMessage = err.message;
      }

      showSnackBar(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatSotVariables = (sotType: string, props?: TagOption[]) => {
    if (!props?.length) return `{ 'sotType': '${sotType || "unknown"}' }`;
    return `{ 'sotType': '${sotType}', ${props
      .map(({ tagKey, tagName }) => `'${tagKey}': '${tagName}'`)
      .join(",\r\n")} }`;
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSubmittedData(null);
  };

  const handleCloseAndReset = () => {
    setShowSuccess(false);
    setSubmittedData(null);
    setFiles([]);
    setExistingAttachments([]);
    onClose();
  };

  // Convert existing Jira attachments and new files to display format
  const getDisplayFiles = () => {
    const existingFiles = existingAttachments.map((att) => ({
      ...att,
      name: att.filename,
      type: att.mimeType,
      src: att.imageThumbnail, // Use thumbnail for display
      isExisting: true,
      isJiraAttachment: true
    }));

    const newFiles = files.map((file) => {
      return {
        name: file.name,
        type: file.type,
        src: URL.createObjectURL(file),
        isExisting: false,
        isJiraAttachment: false
      };
    });

    return [...existingFiles, ...newFiles];
  };

  // Field Renderer
  const renderField = (field: FieldName) => {
    const { fieldKey, fieldLabel, required, fieldType } = field;

    // Platform
    if (fieldKey === "platform") {
      return (
        <Controller
          name={fieldKey}
          control={control}
          defaultValue={[]}
          rules={{
            required: required ? "Select at least one platform" : false,
          }}
          render={({ field, fieldState }) => (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ color: "white", fontWeight: 500 }}
              >
                {fieldLabel}{" "}
                {required && <span style={{ color: "#ef4444" }}>*</span>}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {["iOS", "Android", "Desktop"].map((opt) => (
                  <FormControlLabel
                    key={opt}
                    control={
                      <Checkbox
                        checked={field.value?.includes(opt) ?? false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const newVal = checked
                            ? [...(field.value || []), opt]
                            : (field.value || []).filter(
                                (v: string) => v !== opt
                              );
                          field.onChange(newVal);
                        }}
                        sx={{
                          color: "#06B6D4",
                          "&.Mui-checked": { color: "#06B6D4" },
                        }}
                      />
                    }
                    label={<span style={{ color: "white" }}>{opt}</span>}
                  />
                ))}
              </Box>
              {fieldState.error && (
                <Typography color="error" variant="caption" sx={{ mt: 0.5 }}>
                  {fieldState.error.message}
                </Typography>
              )}
            </Box>
          )}
        />
      );
    }

    // Attachments
    if (fieldKey === "attachments") {
      return (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Upload size={16} />}
            onClick={(e) => {
              e.preventDefault();
              openModal();
            }}
            sx={{
              borderColor: "#4B5563",
              color: "#D1D5DB",
              "&:hover": {
                borderColor: "#06B6D4",
                bgcolor: "rgba(6,182,212,0.1)",
              },
            }}
          >
            Upload Attachments
          </Button>

          {(existingAttachments.length > 0 || files.length > 0) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ color: "white", mb: 1 }}>
                Attachments ({existingAttachments.length + files.length})
              </Typography>

              {/* Show existing Jira attachments with preview */}
              {existingAttachments.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: "#9CA3AF", display: "block", mb: 1 }}
                  >
                    Previously uploaded:
                  </Typography>
                  <FilesThumbnails
                    label=""
                    initialData={existingAttachments.map(att => ({
                      ...att,
                      name: att.filename,
                      type: att.mimeType,
                      src: att.imageThumbnail,
                      isExisting: true,
                      isJiraAttachment: true
                    }))}
                    onUpdateFiles={(updatedFiles) => {
                      // Remove existing attachments that were deleted
                      const remainingExisting = existingAttachments.filter(
                        (existing) =>
                          updatedFiles.some(
                            (updated) => updated.id === existing.id
                          )
                      );
                      setExistingAttachments(remainingExisting);
                    }}
                  />
                </Box>
              )}

              {/* Show new files */}
              {files.length > 0 && (
                <FilesThumbnails
                  label="New Files"
                  initialData={files.map(file => ({
                    name: file.name,
                    type: file.type,
                    src: URL.createObjectURL(file),
                    isExisting: false,
                    isJiraAttachment: false
                  }))}
                  onUpdateFiles={(updatedFiles) => {
                    // Convert back to File objects for parent
                    const updatedFileObjects = files.filter(file =>
                      updatedFiles.some(updated => updated.name === file.name)
                    );
                    setFiles(updatedFileObjects);
                  }}
                />
              )}
            </Box>
          )}

          <FileUploadModal
            isOpen={modalOpen}
            onRequestClose={closeModal}
            onDrop={handleDrop}
          />
        </Box>
      );
    }

    // SOT Properties
    if (fieldType === "Autocomplete" && fieldKey.startsWith("sotProperties")) {
      return (
        <Controller
          name={fieldKey}
          control={control}
          defaultValue={[]}
          rules={{
            required: required ? "Select at least one SOT property" : false,
          }}
          render={({
            field: { value, onChange, ...fieldProps },
            fieldState,
          }) => {
            const normalizedValue = Array.isArray(value)
              ? value.map((item) =>
                  typeof item === "string"
                    ? { tagKey: item, tagName: item }
                    : item
                )
              : [];

            return (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ color: "white", fontWeight: 500 }}
                >
                  {fieldLabel}{" "}
                  {required && <span style={{ color: "#ef4444" }}>*</span>}
                </Typography>

                <Autocomplete
                  {...fieldProps}
                  multiple
                  options={tagData as TagOption[]}
                  getOptionLabel={(opt: TagOption) =>
                    `${opt.tagName} (${opt.tagKey})`
                  }
                  value={normalizedValue}
                  onChange={(_, newValue) => {
                    onChange(newValue);
                  }}
                  isOptionEqualToValue={(option: TagOption, value: TagOption) =>
                    option.tagKey === value.tagKey
                  }
                  PopperComponent={CustomPopper}
                  PaperComponent={(props) => (
                    <Paper
                      {...props}
                      sx={{
                        bgcolor: "#1F2937",
                        color: "white",
                        "& .MuiAutocomplete-option": {
                          color: "white",
                          "&:hover": { bgcolor: "#374151" },
                          "&.Mui-focused": { bgcolor: "#374151" },
                        },
                      }}
                    />
                  )}
                  renderTags={(value: TagOption[], getTagProps) =>
                    value.map((option: TagOption, index: number) => (
                      <Chip
                        key={option.tagKey}
                        label={option.tagName}
                        size="small"
                        {...getTagProps({ index })}
                        sx={{
                          bgcolor: "#06B6D4",
                          color: "#000",
                          "& .MuiChip-deleteIcon": {
                            color: "#000",
                            "&:hover": {
                              color: "#000",
                            },
                          },
                        }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      placeholder="Search SOT properties..."
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#1F2937",
                          color: "white",
                          "& fieldset": { borderColor: "#4B5563" },
                          "&:hover fieldset": { borderColor: "#06B6D4" },
                          "&.Mui-focused fieldset": { borderColor: "#06B6D4" },
                        },
                        "& .MuiInputBase-input": {
                          color: "white",
                          "&::placeholder": {
                            color: "#9CA3AF",
                            opacity: 1,
                          },
                        },
                        "& .MuiSvgIcon-root": {
                          color: "white",
                        },
                        "& .MuiFormHelperText-root": {
                          color: "#ef4444",
                        },
                      }}
                    />
                  )}
                />

                {fieldState.error && (
                  <Typography color="error" variant="caption" sx={{ mt: 0.5 }}>
                    {fieldState.error.message}
                  </Typography>
                )}
              </Box>
            );
          }}
        />
      );
    }

    // Default Text/Textarea
    return (
      <Controller
        name={fieldKey}
        control={control}
        defaultValue=""
        rules={{ required: required ? `${fieldLabel} is required` : false }}
        render={({ field, fieldState }) => (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ color: "white", fontWeight: 500 }}
            >
              {fieldLabel}{" "}
              {required && <span style={{ color: "#ef4444" }}>*</span>}
            </Typography>
            <TextField
              {...field}
              multiline={fieldKey === "description" || fieldKey === "comments"}
              rows={
                fieldKey === "description" || fieldKey === "comments" ? 4 : 1
              }
              fullWidth
              variant="outlined"
              placeholder={
                fieldKey === "description" || fieldKey === "comments"
                  ? `Enter ${fieldLabel.toLowerCase()}...`
                  : ""
              }
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#1F2937",
                  color: "white",
                  "& fieldset": { borderColor: "#4B5563" },
                  "&:hover fieldset": { borderColor: "#06B6D4" },
                  "&.Mui-focused fieldset": { borderColor: "#06B6D4" },
                },
                "& .MuiInputBase-input": {
                  color: "white",
                },
                "& .MuiFormHelperText-root": {
                  color: "#ef4444",
                },
              }}
            />
          </Box>
        )}
      />
    );
  };

  // JSX
  return (
    <Box sx={{ position: 'relative' }}>
      {/* Loading Backdrop */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          position: 'absolute',
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }}
        open={isLoading}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 2
        }}>
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ color: 'white' }}>
            {isEditMode ? "Updating Request..." : "Submitting Request..."}
          </Typography>
        </Box>
      </Backdrop>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle
          sx={{
            bgcolor: "#111827",
            color: "#F3F4F6",
            borderBottom: "1px solid #374151",
            py: 2,
            position: "relative",
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <Box sx={{ flex: 1, pr: 2 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: "white" }}>
              {isEditMode ? "Edit Event Request" : "Stag New Event Request Form"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
              {isEditMode
                ? "Update the event request details below"
                : "Fill in all required fields to create a new event request"}
            </Typography>

            {/* Success Message */}
            <Collapse in={showSuccess} sx={{ width: '100%', mt: 2 }}>
              <Alert
                severity="success"
                action={
                  <IconButton
                    aria-label="close"
                    color="inherit"
                    size="small"
                    onClick={handleCloseSuccess}
                  >
                    <X fontSize="inherit" />
                  </IconButton>
                }
                sx={{
                  bgcolor: "#10B981",
                  color: "white",
                  "& .MuiAlert-icon": { color: "white" },
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {isEditMode
                    ? "Request Updated Successfully!"
                    : "Request Submitted Successfully!"}
                </Typography>
                {submittedData && (
                  <Box sx={{ mt: 1, fontSize: "0.875rem" }}>
                    <Typography variant="body2">
                      <strong>Request ID:</strong> {submittedData.id}
                    </Typography>
                    {submittedData.jiraTicket && (
                      <Typography variant="body2">
                        <strong>Jira Ticket:</strong>{" "}
                        <a
                          href={submittedData.jiraTicket}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#06B6D4", textDecoration: "none" }}
                        >
                          {submittedData.issueKey}
                        </a>
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>Title:</strong> {submittedData.title}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Platform:</strong>{" "}
                      {Array.isArray(submittedData.platform)
                        ? submittedData.platform.join(", ")
                        : submittedData.platform}
                    </Typography>
                    {submittedData.attachments &&
                      submittedData.attachments.length > 0 && (
                        <Typography variant="body2">
                          <strong>Attachments:</strong>{" "}
                          {submittedData.attachments.length} file(s)
                        </Typography>
                      )}
                  </Box>
                )}
              </Alert>
            </Collapse>
          </Box>
          
          {/* Close Icon */}
          <IconButton
            onClick={handleCloseAndReset}
            sx={{
              color: "#9CA3AF",
              "&:hover": {
                color: "#06B6D4",
                bgcolor: "rgba(6,182,212,0.1)"
              }
            }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            bgcolor: "#1F2937",
            py: 3,
            overflowY: "auto",
            maxHeight: "70vh",
            "&::-webkit-scrollbar": { width: "8px" },
            "&::-webkit-scrollbar-track": {
              bgcolor: "#374151",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#4B5563",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": { bgcolor: "#6B7280" },
          }}
        >
          {fieldNames.map((f: FieldName) => (
            <div key={f.fieldKey}>{renderField(f)}</div>
          ))}
        </DialogContent>

        <DialogActions
          sx={{
            bgcolor: "#111827",
            borderTop: "1px solid #374151",
            py: 2,
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          <Button
            onClick={handleCloseAndReset}
            disabled={isLoading}
            variant="outlined"
            sx={{
              color: "#9CA3AF",
              borderColor: "#4B5563",
              "&:hover": {
                bgcolor: "rgba(156,163,175,0.1)",
                borderColor: "#6B7280",
              },
            }}
          >
            {showSuccess ? "Close" : "Cancel"}
          </Button>

          {!showSuccess && (
            <Button
              type="submit"
              disabled={isLoading}
              variant="contained"
              startIcon={
                isLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : null
              }
              sx={{
                bgcolor: isLoading ? "#4B5563" : "#06B6D4",
                color: "#000",
                fontWeight: 600,
                "&:hover": {
                  bgcolor: isLoading ? "#4B5563" : "#0891B2",
                },
              }}
            >
              {isLoading
                ? isEditMode
                  ? "Updating..."
                  : "Submitting..."
                : isEditMode
                ? "Update Request"
                : "Submit Request"}
            </Button>
          )}
        </DialogActions>
      </form>
    </Box>
  );
};

export default AddStagRequest;