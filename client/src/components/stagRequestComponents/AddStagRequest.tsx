import React, { useState } from "react";
import {
  Controller,
  useForm,
} from "react-hook-form";
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
} from "@mui/material";
import { RefreshCw, Upload, X } from "lucide-react";

import tagData from "./data/sotProps.json";
import fieldNames from "./data/requestFormFields.json";
import jiraPostRequest from "./data/jiraPostRequest.json";
import {
  createStagRequest,
  createJiraTicket,
} from "../../hooks/stagRequestService";
import FileUploadModal from "./FileUploadModal";
import FilesThumbnails from "./FilesThumbnails";

// ———————————————————————— Types ————————————————————————
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

interface FormData {
  [key: string]: any;
  platform?: string[];
  attachments?: File[];
  requestId?: string;
  jiraTicket?: string;
  title?: string;
  description?: string;
  comments?: string;
  sotType?: string;
  sotProperties?: TagOption[];
}

// ———————————————————— Custom Popper (Fix Dropdown Visibility) ————————————————————
const CustomPopper = (props: any) => (
  <Popper
    {...props}
    style={{ ...props.style, zIndex: 1300 }}
    placement="bottom-start"
  />
);

// ———————————————————— Main Component ————————————————————
const AddStagRequest: React.FC<{
  onClose: () => void;
  onDataRefresh: () => void;
  showSnackBar: (msg: string, severity: "success" | "error") => void;
}> = ({ onClose, onDataRefresh, showSnackBar }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormData>();

  const [files, setFiles] = useState<File[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const handleDrop = (accepted: File[]) => {
    if (accepted?.length) setFiles((prev) => [...prev, ...accepted]);
  };

  const updateFiles = (newFiles: File[]) => setFiles(newFiles);

  // ——————————————— Form Submission ———————————————
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const sotProperties = data.sotProperties || [];

      console.log('Form data submitted:', data);

       const missing = fieldNames
      .filter((f): f is FieldName & { required: true } => !!f.required)
      .some((f) => {
        const fieldKey = f.fieldKey;
        
        // Check platform (array field)
        if (fieldKey === "platform") {
          return !data.platform || data.platform.length === 0;
        }
        
        // Check SOT properties (array field)
        if (fieldKey.startsWith("sotProperties")) {
          return sotProperties.length === 0;
        }
        
        // Check string fields
        const val = data[fieldKey];
        return !val || (typeof val === "string" && !val.trim());
      });

    if (missing) {
      showSnackBar("Please fill all required fields.", "error");
      setIsLoading(false);
      return;
    }

     const payload: any = {
      title: data.title || '',
      description: data.description || '',
      comments: data.comments || '',
      sotType: data.sotType || '',
      platform: data.platform || [],
      sotProperties: sotProperties,
    };

    console.log('Prepared payload:', payload);

      // Create Jira ticket first
      const jiraBody = {
        ...jiraPostRequest,
        fields: {
          ...jiraPostRequest.fields,
          summary: payload.title || "Stag Event Request",
          description: `AC:\r\n${payload.description || ""}\r\n\r\nPlatform: ${
            Array.isArray(payload.platform) ? payload.platform.join(', ') : payload.platform
          }\r\n\r\nRequired response from UFE:\r\n{code:java}${formatSotVariables(
            payload.sotType,
            sotProperties
          )}{code}\r\n\r\nComments: ${payload.comments || ""}`,
        },
      };

      console.log('Creating Jira ticket...');
      const jiraRes = await createJiraTicket(jiraBody);
      if (!jiraRes?.data?.issueKey) throw new Error("Jira ticket creation failed");

      const jiraUrl = `https://jira.sephora.com/browse/${jiraRes.data.issueKey}`;
      payload.jiraTicket = jiraUrl;

      console.log('Creating Stag request with payload:', payload);
      // Create Stag request with the complete payload
      const stagRes = await createStagRequest(payload);
      if (!stagRes?.success) throw new Error("Stag request creation failed");

      console.log('Stag request created successfully:', stagRes);

      // Store the submitted data to display
      const submittedRequestData = {
        ...payload,
        jiraTicket: jiraUrl,
        status: "submitted",
        issueKey: jiraRes.data.issueKey,
        id: stagRes.data?.id,
        timestamp: stagRes.data?.timestamp || new Date().toISOString(),
      };
      
      setSubmittedData(submittedRequestData);
      setShowSuccess(true);
      
      // Reset form
      reset();
      setFiles([]);
      
      // Refresh parent data after a short delay
      setTimeout(() => {
        onDataRefresh();
        showSnackBar("Request submitted successfully!", "success");
      }, 1000);

    } catch (err: any) {
      console.error('Submission error:', err);
      showSnackBar(err.message || "Submission failed. Please try again.", "error");
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
    onClose();
  };

  // ——————————————— Field Renderer ———————————————
  const renderField = (field: FieldName) => {
    const { fieldKey, fieldLabel, required, fieldType } = field;

    // Platform
    if (fieldKey === "platform") {
      return (
        <Controller
          name={fieldKey}
          control={control}
          defaultValue={[]}
          rules={{ required: required ? "Select at least one platform" : false }}
          render={({ field, fieldState }) => (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ color: "white", fontWeight: 500 }}
              >
                {fieldLabel} {required && <span style={{ color: "#ef4444" }}>*</span>}
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
                            : (field.value || []).filter((v: string) => v !== opt);
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

          {files.length > 0 && (
            <FilesThumbnails
              label="Uploaded Files"
              initialData={files}
              onUpdateFiles={updateFiles}
            />
          )}

          <FileUploadModal
            isOpen={modalOpen}
            onRequestClose={closeModal}
            onDrop={handleDrop}
          />
        </Box>
      );
    }

    // SOT Properties – Multiple Autocomplete (FIXED)
    if (fieldType === 'Autocomplete' && fieldKey.startsWith("sotProperties")) {
      return (
        <Controller
          name={fieldKey}
          control={control}
          defaultValue={[]}
          rules={{ required: required ? "Select at least one SOT property" : false }}
          render={({ field: { value, onChange, ...fieldProps }, fieldState }) => (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ color: "white", fontWeight: 500 }}
              >
                {fieldLabel} {required && <span style={{ color: "#ef4444" }}>*</span>}
              </Typography>

              <Autocomplete
                {...fieldProps}
                multiple
                options={tagData}
                getOptionLabel={(opt: TagOption) => `${opt.tagName} (${opt.tagKey})`}
                value={value || []}
                onChange={(_, newValue) => {
                  onChange(newValue);
                }}
                isOptionEqualToValue={(option, value) => 
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
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
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
                          }
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
          )}
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
              {fieldLabel} {required && <span style={{ color: "#ef4444" }}>*</span>}
            </Typography>
            <TextField
              {...field}
              multiline={fieldKey === "description" || fieldKey === "comments"}
              rows={fieldKey === "description" || fieldKey === "comments" ? 4 : 1}
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

  // ———————————————————— JSX ————————————————————
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <DialogTitle
        sx={{
          bgcolor: "#111827",
          color: "#F3F4F6",
          borderBottom: "1px solid #374151",
          py: 2,
          position: "relative",
        }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ color: "white" }}>
          Stag New Event Request Form
        </Typography>
        <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
          Fill in all required fields to create a new event request
        </Typography>
        
        {/* Success Message */}
        <Collapse in={showSuccess}>
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
              mt: 2,
              bgcolor: "#10B981",
              color: "white",
              "& .MuiAlert-icon": { color: "white" },
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Request Submitted Successfully!
            </Typography>
            {submittedData && (
              <Box sx={{ mt: 1, fontSize: "0.875rem" }}>
                <Typography variant="body2">
                  <strong>Request ID:</strong> {submittedData.id}
                </Typography>
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
                <Typography variant="body2">
                  <strong>Title:</strong> {submittedData.title}
                </Typography>
                <Typography variant="body2">
                  <strong>Platform:</strong> {Array.isArray(submittedData.platform) ? submittedData.platform.join(', ') : submittedData.platform}
                </Typography>
              </Box>
            )}
          </Alert>
        </Collapse>
      </DialogTitle>

      <DialogContent
        sx={{
          bgcolor: "#1F2937",
          py: 3,
          overflowY: "auto",
          maxHeight: "70vh",
          "&::-webkit-scrollbar": { width: "8px" },
          "&::-webkit-scrollbar-track": { bgcolor: "#374151", borderRadius: "4px" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#4B5563", borderRadius: "4px" },
          "&::-webkit-scrollbar-thumb:hover": { bgcolor: "#6B7280" },
        }}
      >
        {fieldNames.map((f) => (
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
            startIcon={isLoading ? <RefreshCw size={16} className="animate-spin" /> : null}
            sx={{
              bgcolor: isLoading ? "#4B5563" : "#06B6D4",
              color: "#000",
              fontWeight: 600,
              "&:hover": {
                bgcolor: isLoading ? "#4B5563" : "#0891B2",
              },
            }}
          >
            {isLoading ? "Submitting…" : "Submit Request"}
          </Button>
        )}
      </DialogActions>
    </form>
  );
};

export default AddStagRequest;