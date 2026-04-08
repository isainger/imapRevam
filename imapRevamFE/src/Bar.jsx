import { useEffect, useRef, useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { useForm } from "@mantine/form";
import groupedProductOptions from "./data/GroupedProductItems";
import emailGroups from "./data/EmailGroups";
import performers from "./data/performerList";
import RadioBtn from "./components/RadioBtn";
import IncidentTxtBox from "./components/IncidentTxtBox";
import DropdownBtn from "./components/DropdownBtn";
import MultiSelectEmails from "./components/MultiSelectEmails";
import ActionBtn from "./components/ActionBtn";
import InputBtn from "./components/InputBtn";
import DateTimeSelector from "./components/DateTimeSelector";
import EmailTemplateLayout from "./utils/EmailTemplateLayout";
import { Box, Textarea, Modal } from "@mantine/core";
import SearchableInput from "./components/SearchableInput";
import { notifications } from "@mantine/notifications";
import {
  fetchIncidentByNumber,
  fetchAllIncidents,
  saveIncident,
  sendDepartmentChangeEmail,
} from "./services/incidentOperations";
import DepartmentCard from "./components/DepartmentCard";
import IncidentData from "./components/IncidentData";
import ConfirmSubmitModal from "./components/ConfirmSubmitModal";
import StatsOverview from "./components/StatsOverview";
import DepartmentChangeFlow from "./components/DepartmentChangeFlow";

const Bar = () => {
  const formTabs = ["Advertiser", "General", "Publisher"];
  const [formStep, setFormStep] = useState(1);
  const [incidentAction, setIncidentAction] = useState([]);
  const [oldIncidentData, setOldIncidentData] = useState(null);
  const [originalIncident, setOriginalIncident] = useState(null);
  const [allIncidents, setAllIncidents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStage, setConfirmStage] = useState("confirm"); // confirm | success
  const [confirmPurpose, setConfirmPurpose] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState(null);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [deptConfirmOpen, setDeptConfirmOpen] = useState(false);
  const [deptFlowStep, setDeptFlowStep] = useState("confirm");
  const [pendingDepartment, setPendingDepartment] = useState(null);
  const [deptEmail, setDeptEmail] = useState("");
  const [notifyStakeholders, setNotifyStakeholders] = useState(false);
  const [deptProgress, setDeptProgress] = useState(0);
  const [departmentLocked, setDepartmentLocked] = useState(false);
  const prevStatusRef = useRef(null);
  const statusUpdateCacheRef = useRef({});

  const statusGradientMapNormal = {
    Suspected: {
      gradient: "#0056f0", // blue
      iconClass: "fa-solid fa-magnifying-glass",
    },
    Ongoing: {
      gradient: "#e53e3e", // red
      iconClass: "fa-solid fa-circle",
    },
    "Not an Issue": {
      gradient: "", // blue
      iconClass: "",
    },
    Resolved: {
      gradient: "#ecc94b", // yellow
      iconClass: "fa-solid fa-screwdriver-wrench",
    },
    "Resolved with RCA": {
      gradient: "#38a169", // green
      iconClass: "fa-solid fa-square-check",
    },
  };
  const statusGradientMapKnownIssue = {
    Ongoing: {
      gradient: "#e53e3e", // red
      iconClass: "fa-solid fa-circle",
    },
    Resolved: {
      gradient: "#ecc94b", // yellow
      iconClass: "fa-solid fa-screwdriver-wrench",
    },
  };
  const departmentToGroupsMap = {
    Publisher: ["Publisher"],
    Advertiser: ["Advertiser"],
    General: ["Publisher", "Advertiser"],
  };

  const STATUS_FLOW = ["Suspected", "Ongoing", "Resolved", "Resolved with RCA"];

  function isFormChanged() {
    if (!originalIncident) return true;

    const current = form.values;

    // inputBox
    if (
      // (current.inputBox.inputNumber || "") !==
      //   (originalIncident.incident_number || "") ||
      (current.inputBox.subject || "") !==
        (originalIncident.incident_subject || "") ||
      (current.inputBox.incidentLink || "") !==
        (originalIncident.incident_link || "") ||
      (current.inputBox.performer || "") !==
        (originalIncident.performer || "") ||
      (current.inputBox.revenueImpactDetails || "") !==
        (originalIncident.revenue_impact_details || "")
    )
      return true;

    // radio
    if (
      // (current.radio.inputIncident || "") !==
      //   (originalIncident.incident_number ? "Yes" : "No") ||
      (current.radio.status || "") !==
        (originalIncident.incident_status || "") ||
      (current.radio.incidentType || "") !==
        (originalIncident.incident_type || "") ||
      (current.radio.revenueImpact || "") !==
        (originalIncident.revenue_impact || "") ||
      (current.radio.nextUpdate || "") !==
        (originalIncident.next_update || "") ||
      (current.radio.workaround || "") !==
        (originalIncident.workaround || "") ||
      (current.radio.known_issue || "") !== (originalIncident.known_issue || "")
    )
      return true;

    // remainingStatus comparison (ignore color/icons)
    const currentStatuses = (current.radio.remainingStatus || []).map(
      (s) => s.statusName
    );
    const originalStatuses = (originalIncident.remaining_status || []).map(
      (s) => (typeof s === "string" ? s : s.statusName)
    );
    if (JSON.stringify(currentStatuses) !== JSON.stringify(originalStatuses))
      return true;

    // dropdowns
    const currentMails = current.dropDown.notificationMails || [];
    const originalMails = originalIncident.notification_mails || [];
    if (
      (current.dropDown.reportedBy || "") !==
        (originalIncident.reported_by || "") ||
      (current.dropDown.severity || "") !== (originalIncident.severity || "") ||
      (current.dropDown.affectedProduct || "") !==
        (originalIncident.affected_product || "") ||
      (current.dropDown.regionImpacted || "") !==
        (originalIncident.region_impacted || "") ||
      (current.dropDown.serviceImpacted || "") !==
        (originalIncident.service_impacted || "") ||
      JSON.stringify(currentMails) !== JSON.stringify(originalMails)
    )
      return true;

    // dates
    const currentStart = current.dateTime.startTime.local?.getTime() || null;
    const currentDiscovered =
      current.dateTime.discoveredTime.local?.getTime() || null;
    const currentNextUpdate =
      current.dateTime.nextUpdateTime.local?.getTime() || null;
    const currentResolved =
      current.dateTime.resolvedTime.local?.getTime() || null;
    const currentResolvedRca =
      current.dateTime.resolvedWithRcaTime.local?.getTime() || null;

    const originalStart = originalIncident.start_time
      ? new Date(originalIncident.start_time).getTime()
      : null;
    const originalDiscovered = originalIncident.discovered_time
      ? new Date(originalIncident.discovered_time).getTime()
      : null;
    const originalNextUpdate = originalIncident.next_update_time
      ? new Date(originalIncident.next_update_time).getTime()
      : null;
    const originalResolved = originalIncident.resolved_time
      ? new Date(originalIncident.resolved_time).getTime()
      : null;
    const originalResolvedRca = originalIncident.resolved_with_rca_time
      ? new Date(originalIncident.resolved_with_rca_time).getTime()
      : null;
    if (
      currentStart !== originalStart ||
      currentDiscovered !== originalDiscovered ||
      currentNextUpdate !== originalNextUpdate ||
      currentResolved !== originalResolved ||
      currentResolvedRca !== originalResolvedRca
    )
      return true;

    // text areas
    const ta = current.textArea;
    const origTa = originalIncident;
    if (
      (ta.incidentDetails || "") !== (origTa.incident_details || "") ||
      (ta.statusUpdateDetails || "") !== (origTa.status_update_details || "") ||
      (ta.workaroundDetails || "") !== (origTa.workaround_details || "") ||
      (ta.resolvedDetails || "") !== (origTa.resolved_details || "") ||
      (ta.resolvedwithRcaDetails || "") !==
        (origTa.resolved_with_rca_details || "")
    )
      return true;

    return false; // no changes detected
  }
  const initial_values = {
    departmentName: formTabs[0],
    disabledStatus: null,
    inputBox: {
      inputNumber: "",
      subject: "",
      incidentLink: "",
      performer: "",
      revenueImpactDetails: "",
    },
    radio: {
      known_issue: "",
      inputIncident: "",
      status: "",
      remainingStatus: [],
      incidentType: "",
      revenueImpact: "",
      nextUpdate: "",
      workaround: "",
    },
    dropDown: {
      reportedBy: null,
      severity: null,
      affectedProduct: null,
      regionImpacted: null,
      serviceImpacted: null,
      notificationMails: [],
      allEmailOptions: Object.entries(emailGroups).map(([key, emails]) => ({
        group: key,
        emails: [...new Set(emails)],
      })),
    },
    dateTime: {
      startTime: { local: null, utc: null },
      discoveredTime: { local: null, utc: null },
      nextUpdateTime: { local: null, utc: null },
      resolvedTime: { local: null, utc: null },
      resolvedWithRcaTime: { local: null, utc: null },
    },
    textArea: {
      incidentDetails: "",
      statusUpdateDetails: "",
      workaroundDetails: "",
      resolvedDetails: "",
      resolvedwithRcaDetails: "",
    },
    statusUpdate: false,
    modalOpen: false,
  };

  const isCreateFormDirty = () => {
    const v = form.values;

    // input fields
    if (
      v.inputBox.inputNumber ||
      v.inputBox.subject ||
      v.inputBox.incidentLink ||
      v.inputBox.performer ||
      v.inputBox.revenueImpactDetails
    ) {
      return true;
    }

    // radios
    if (
      v.radio.known_issue ||
      v.radio.status ||
      v.radio.incidentType ||
      v.radio.revenueImpact ||
      v.radio.nextUpdate ||
      v.radio.workaround
    ) {
      return true;
    }

    // remaining statuses
    if (v.radio.remainingStatus?.length > 0) return true;

    // dropdowns
    if (
      v.dropDown.reportedBy ||
      v.dropDown.severity ||
      v.dropDown.affectedProduct ||
      v.dropDown.regionImpacted ||
      v.dropDown.serviceImpacted ||
      v.dropDown.notificationMails.length > 0
    ) {
      return true;
    }

    // date/time
    if (
      v.dateTime.startTime.local ||
      v.dateTime.discoveredTime.local ||
      v.dateTime.nextUpdateTime.local ||
      v.dateTime.resolvedTime.local ||
      v.dateTime.resolvedWithRcaTime.local
    ) {
      return true;
    }

    // text areas
    if (
      v.textArea.incidentDetails ||
      v.textArea.statusUpdateDetails ||
      v.textArea.workaroundDetails ||
      v.textArea.resolvedDetails ||
      v.textArea.resolvedwithRcaDetails
    ) {
      return true;
    }

    return false;
  };

  const form = useForm({
    initialValues: initial_values,
    validate: {
      // InputBox validations
      inputBox: {
        inputNumber: (value) =>
          incidentAction.actionType === "update" && value.trim().length === 0
            ? "Incident number is required"
            : null, // no numeric check anymore
        subject: (value) =>
          value.trim().length < 5
            ? "Subject must be at least 5 characters"
            : null,
        incidentLink: (value) =>
          !/^https:\/\/taboola\.lightning\.force\.com\/lightning\/r\/Case\/[A-Za-z0-9]+\/view$/.test(
            value
          )
            ? "Please enter a valid Taboola Case link"
            : null,
        performer: (value) =>
          !/^[A-Za-z\s]+ \([A-Za-z0-9._%+-]+@taboola\.com\)$/.test(value)
            ? "Please select a valid name and a valid Taboola email"
            : null,
        revenueImpactDetails: (value, values) =>
          values.radio.revenueImpact === "Yes" && value.trim().length < 2
            ? "Please provide revenue impact details (min 2 characters)"
            : null,
      },

      // Radio validations
      radio: {
        // inputIncident: (value) => (!value ? "Please select incident" : null),
        known_issue: (value) => (!value ? "Please select knwon issue" : null),
        status: (value) => (!value ? "Please select status" : null),
        incidentType: (value) =>
          !value ? "Please select incident type" : null,
        revenueImpact: (value) =>
          !value ? "Please select revenue impact" : null,
        nextUpdate: (value) =>
          !value ? "Please select next availability " : null,
        workaround: (value) =>
          !value ? "Please select workaround availability " : null,
      },
      // Dropdown validations
      dropDown: {
        reportedBy: (value) => (!value ? "Reported by is required" : null),
        severity: (value) => (!value ? "Please select severity" : null),
        affectedProduct: (value) =>
          !value ? "Please select affected product" : null,
        regionImpacted: (value) =>
          !value ? "Please select region impacted" : null,
        serviceImpacted: (value) =>
          !value ? "Please select service impacted" : null,
        notificationMails: (value) =>
          value.length === 0 ? "Add at least one notification email" : null,
      },

      // DateTime validations
      dateTime: {
        startTime: (value) => (!value.local ? "Start time is required" : null),
        discoveredTime: (value) =>
          !value.local ? "Discovered time is required" : null,
        nextUpdateTime: (value, values) =>
          values.radio.nextUpdate === "Yes" && !value.local
            ? "Next update time is required"
            : null,
        resolvedTime: (value, values) =>
          values.radio.status === "Resolved" && !value.local
            ? "Resolved time is required"
            : null,

        resolvedWithRcaTime: (value, values) =>
          values.radio.status === "Resolved with RCA" && !value.local
            ? "Resolved with RCA time is required"
            : null,
      },
      textArea: {
        incidentDetails: (value) =>
          value.trim().length < 5
            ? "Incident Details must be at least 5 characters"
            : null,
        statusUpdateDetails: (value, values) => {
          if (values.statusUpdate !== true) return null;

          const plainText = stripHtml(value).trim();

          return plainText.length < 5
            ? "Please provide status update (min 5 characters)"
            : null;
        },
        workaroundDetails: (value, values) =>
          values.radio.workaround === "Yes" && value.trim().length < 5
            ? "Please provide workaround update (min 5 characters)"
            : null,
        resolvedDetails: (value, values) =>
          (values.radio.status === "Resolved" ||
            values.radio.status === "Resolved with RCA") &&
          value.trim().length < 5
            ? "Please provide Resolved Details update (min 5 characters)"
            : null,
        resolvedwithRcaDetails: (value, values) =>
          values.radio.status === "Resolved with RCA" && value.trim().length < 5
            ? "Please provide Resolved with RCA update (min 5 characters)"
            : null,
      },
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchAllIncidents();
      setAllIncidents(data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const currentStatus = form.values.radio.status;
    const prevStatus = prevStatusRef.current;

    if (!prevStatus) {
      prevStatusRef.current = currentStatus;
      return;
    }

    if (prevStatus === currentStatus) return;

    const currentText = form.values.textArea.statusUpdateDetails;

    if (currentText?.trim()) {
      statusUpdateCacheRef.current[prevStatus] = currentText;
    }

    const restoredText = statusUpdateCacheRef.current[currentStatus] || "";

    form.setFieldValue("textArea.statusUpdateDetails", restoredText);
    form.setFieldValue(
      "statusUpdate",
      stripHtml(restoredText).trim().length > 0
    );

    prevStatusRef.current = currentStatus;
  }, [form.values.radio.status]);

  useEffect(() => {
    if (originalIncident) return;

    const status = form.values.radio.status;
    const knownIssue = form.values.radio.known_issue;

    // nothing selected yet
    if (!status) {
      form.setFieldValue("radio.remainingStatus", []);
      return;
    }

    // Not an Issue → no timeline
    if (status === "Not an Issue") {
      form.setFieldValue("radio.remainingStatus", []);
      return;
    }

    const flow =
      knownIssue === "Yes"
        ? Object.keys(statusGradientMapKnownIssue)
        : STATUS_FLOW;

    const index = flow.indexOf(status);

    if (index === -1) {
      form.setFieldValue("radio.remainingStatus", []);
      return;
    }

    const map =
      knownIssue === "Yes"
        ? statusGradientMapKnownIssue
        : statusGradientMapNormal;

    const remainingStatusValues = flow.slice(index).map((s) => ({
      statusName: s,
      color: map[s]?.gradient,
      icons: map[s]?.iconClass,
    }));

    form.setFieldValue("radio.remainingStatus", remainingStatusValues);
  }, [form.values.radio.status, form.values.radio.known_issue]);

  useEffect(() => {
    if (deptFlowStep !== "submitting") return;

    setDeptProgress(0);

    const interval = setInterval(() => {
      setDeptProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.floor(Math.random() * 8 + 3);
      });
    }, 300);

    return () => clearInterval(interval);
  }, [deptFlowStep]);

  useEffect(() => {
    if (deptFlowStep !== "success") return;

    const t = setTimeout(() => {
      handleDeptConfirmDirect();
    }, 1200);

    return () => clearTimeout(t);
  }, [deptFlowStep]);

  useEffect(() => {
    if (confirmStage !== "submitting") return;

    setSubmitProgress(0);

    const interval = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.floor(Math.random() * 8 + 3);
      });
    }, 300);

    return () => clearInterval(interval);
  }, [confirmStage]);

  useEffect(() => {
    if (deptConfirmOpen) {
      setNotifyStakeholders(false);
      setDeptFlowStep("confirm");
      setDeptEmail("");
    }
  }, [deptConfirmOpen]);

  const computedStep = (() => {
    if (incidentAction.actionType === "create") {
      // CREATE: Known Issue → Department → Full Form
      if (formStep === 1) return "knownIssue";
      if (formStep === 2) return "department";
      return "form";
    }

    if (incidentAction.actionType === "update") {
      // UPDATE: Incident Number → Department → Full Form
      if (formStep === 1) return "fetchIncident";
      if (formStep === 2) return "department";
      return "form";
    }

    return null;
  })();

  const nextStep = () => setFormStep((prev) => prev + 1);
  const prevStep = () => {
    if (formStep > 1) {
      setFormStep((prev) => prev - 1);
      return;
    }

    // step === 1 → exit to dashboard
    handleExitToDashboard();
  };
  const statusGradientMap =
    form.values.radio.known_issue === "Yes"
      ? statusGradientMapKnownIssue
      : statusGradientMapNormal;

  const statusKeys = Object.keys(
    form.values.radio.known_issue === "Yes"
      ? statusGradientMapKnownIssue
      : statusGradientMapNormal
  );
  const dbIndex = form.values.disabledStatus
    ? statusKeys.indexOf(form.values.disabledStatus)
    : -1;

  useEffect(() => {
    // If user selects NO after fetching an incident → reset form fully
    if (form.values.radio.inputIncident === "No" && originalIncident) {
      form.reset(); // full reset to initialValues
      setOriginalIncident(null); // clear fetched reference
    }
  }, [form.values.radio.inputIncident]);

  const handleChange = (field, value) => {
    // 1. Always update UI immediately (fixes the inputBox overwrite lag)
    form.setFieldValue(field, value);

    // auto populate incident number ON CHANGE
    if (field === "inputBox.incidentLink") {
      const incidentNumber = extractIncidentNumber(value);
      if (incidentNumber) {
        form.setFieldValue("inputBox.inputNumber", incidentNumber);
      }
    }

    if (field === "inputBox.subject") {
      filterSuggestions(value);
    }

    // 2. Only run async logic when needed (known_issue OR incidentLink change)
    checkDB(field, value);
  };

  const checkDB = async (field, value) => {
    // if (incidentAction.actionType !== "update") return;

    const incidentNumber = extractIncidentNumber(
      form.values.inputBox.incidentLink
    );

    // If incident number exists → fetch & validate "known_issue"
    if (incidentNumber) {
      const existingIncident = await fetchIncidentByNumber(incidentNumber);

      if (existingIncident?.length > 0) {
        return; // skip radio.status logic when incident exists
      }
    }

    // 3. Only run radio.status logic when NOT linked to an existing incident
    // if (field === "radio.status") {
    //   const statusKeys = Object.keys(statusGradientMap);
    //   const index = statusKeys.indexOf(value);

    //   if (index !== -1 && value !== "Not an Issue") {
    //     const remainingStatusValues = statusKeys
    //       .slice(index)
    //       .filter((item) => item !== "Not an Issue")
    //       .map((item) => ({
    //         statusName: item,
    //         color: statusGradientMap[item].gradient,
    //         icons: statusGradientMap[item].iconClass,
    //       }));

    //     form.setFieldValue("radio.remainingStatus", remainingStatusValues);
    //   } else {
    //     form.setFieldValue("radio.remainingStatus", []);
    //   }
    // }
    //     if (field === "radio.status") {
    //       // Case 1: Not an Issue → no timeline
    //       if (value === "Not an Issue") {
    //         form.setFieldValue("radio.remainingStatus", []);
    //         return;
    //       }
    //       const isKnownIssue = form.values.radio.known_issue === "Yes";
    //       const flow = isKnownIssue
    //         ? Object.keys(statusGradientMapKnownIssue)
    //         : STATUS_FLOW;
    //       // Case 2: status belongs to lifecycle
    //       const index = flow.indexOf(value);
    // console.log(flow);

    //       if (index === -1) {
    //         form.setFieldValue("radio.remainingStatus", []);
    //         return;
    //       }
    // console.log(index);

    //       const remainingStatusValues = flow
    //         .slice(index) // INCLUDE selected status
    //         .map((status) => ({
    //           statusName: status,
    //           color: statusGradientMap[status]?.gradient,
    //           icons: statusGradientMap[status]?.iconClass,
    //         }));
    // console.log(remainingStatusValues);

    //       form.setFieldValue("radio.remainingStatus", remainingStatusValues);
    //     }
  };
  const filterSuggestions = (value) => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const seen = new Set();

    const filtered = allIncidents
      .filter((i) =>
        i.incident_subject?.toLowerCase().includes(value.toLowerCase())
      )
      .filter((i) => {
        const subject = i.incident_subject?.toLowerCase();
        if (!subject || seen.has(subject)) return false;
        seen.add(subject);
        return true;
      })
      .slice(0, 8);

    setSuggestions(filtered);
  };
  const handleDateTimeChange = (fieldKey, date) => {
    // 🔴 If cleared, clear BOTH local and utc
    if (!date) {
      form.setFieldValue(`dateTime.${fieldKey}`, {
        local: null,
        utc: null,
      });
      return;
    }

    const fullDate = new Date(date);
    if (isNaN(fullDate.getTime())) return;

    form.setFieldValue(`dateTime.${fieldKey}`, {
      local: fullDate,
      utc: fullDate.toISOString(),
    });
  };

  const stripHtml = (html) => {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  useEffect(() => {
    const selectedItem = form.values.dropDown.affectedProduct;
    const department = form.values.departmentName;
  
    if (!selectedItem) return;
  
    // get allowed groups based on department
    const allowedGroups = departmentToGroupsMap[department] || [];
  
    let emails = [];
  
    allowedGroups.forEach((group) => {
      const emailOption = form.values.dropDown.allEmailOptions.find(
        (item) => item.group === group
      );
  
      if (emailOption?.emails) {
        emails.push(...emailOption.emails);
      }
    });
  
    // remove duplicates
    const uniqueEmails = [...new Set(emails)];
  
    form.setFieldValue("dropDown.notificationMails", uniqueEmails);
  }, [form.values.dropDown.affectedProduct]);

  function extractIncidentNumber(input) {
    if (!input) return null;

    const value = input.trim();

    // Salesforce Case URL
    const match = value.match(/\/Case\/([a-zA-Z0-9]+)\//);
    if (match) return match[1];

    // Already a case id or custom string
    return value;
  }

  const resetToMainScreen = () => {
    form.reset();
    setOriginalIncident(null);
    setOldIncidentData(null);

    setFormStep(1);
    setDepartmentLocked(false); // ✅ RESET HERE

    setIncidentAction({
      showForm: false,
      actionType: null,
    });
  };
  const openConfirm = (purpose) => {
    setConfirmPurpose(purpose); // "exit" | "submit"
    setConfirmStage("confirm");
    setConfirmOpen(true);
  };
  const handleExitToDashboard = () => {
    const hasUnsavedChanges =
      (incidentAction.actionType === "update" &&
        originalIncident &&
        isFormChanged()) ||
      (incidentAction.actionType === "create" && isCreateFormDirty());

    if (hasUnsavedChanges) {
      openConfirm("exit");
      return;
    }

    resetToMainScreen();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validate = form.validate();
    if (validate.hasErrors) {
      notifications.show({
        title: "Validation Error",
        message:
          "Please fix the highlighted fields before previewing.",
        color: "red",
      });
      return;
    }
    const incidentNumber = extractIncidentNumber(
      form.values.inputBox.incidentLink
    );

    if (!incidentNumber) {
      notifications.show({
        title: "Incident Number Missing",
        message: "Please provide a valid incident link",
        color: "red",
      });
      return;
    }

    if (incidentAction.actionType == "create" && originalIncident === null) {
      // 👈 only if user never fetched)
      const existingIncident = await fetchIncidentByNumber(incidentNumber);
      if (existingIncident?.length > 0) {
        notifications.show({
          title: "Incident Exists",
          message:
            "This incident number already exists! Please fetch it first to update.",
          color: "red",
        });
        return;
      }
    }

    if (originalIncident && !isFormChanged()) {
      notifications.show({
        title: "No Changes",
        message: "No changes detected from the original incident.",
        color: "yellow",
      });
      return; // prevent saving
    }

    const preparedPayload = {
      incident_number: incidentNumber,
      known_issue: form.values.radio.known_issue,
      incident_subject: form.values.inputBox.subject,
      incident_link: form.values.inputBox.incidentLink,
      performer: form.values.inputBox.performer,
      departmentName: form.values.departmentName,
      incident_status: form.values.radio.status,
      remaining_status:
        form.values.radio.status === "Not an Issue"
          ? JSON.stringify([])
          : JSON.stringify(form.values.radio.remainingStatus), // ✅ save,
      incident_type: form.values.radio.incidentType,
      revenue_impact: form.values.radio.revenueImpact,
      next_update: form.values.radio.nextUpdate,
      workaround: form.values.radio.workaround,
      reported_by: form.values.dropDown.reportedBy,
      severity: form.values.dropDown.severity,
      affected_product: form.values.dropDown.affectedProduct,
      region_impacted: form.values.dropDown.regionImpacted,
      service_impacted: form.values.dropDown.serviceImpacted,
      notification_mails: form.values.dropDown.notificationMails,
      start_time: form.values.dateTime.startTime.utc,
      discovered_time: form.values.dateTime.discoveredTime.utc,
      incident_details: form.values.textArea.incidentDetails,
    };
    // ✅ add only if user provided status update details
    if (
      form.values.statusUpdate === true &&
      form.values.textArea.statusUpdateDetails?.trim()
    ) {
      preparedPayload.status_update_details =
        form.values.textArea.statusUpdateDetails;
    } else {
      preparedPayload.status_update_details = null;
    }

    if (
      form.values.radio.status === "Resolved" ||
      form.values.radio.status === "Resolved with RCA"
    ) {
      preparedPayload.resolved_details = form.values.textArea.resolvedDetails;
      preparedPayload.resolved_time = form.values.dateTime.resolvedTime.utc;
    } else {
      preparedPayload.resolved_details = null;
      preparedPayload.resolved_time = null;
    }
    if (form.values.radio.status === "Resolved with RCA") {
      preparedPayload.resolved_with_rca_details =
        form.values.textArea.resolvedwithRcaDetails;
      preparedPayload.resolved_with_rca_time =
        form.values.dateTime.resolvedWithRcaTime.utc;
    } else {
      preparedPayload.resolved_with_rca_details = null;
      preparedPayload.resolved_with_rca_time = null;
    }
    // ✅ add only if user provided workaround details
    if (
      form.values.radio.workaround === "Yes" &&
      form.values.textArea.workaroundDetails?.trim()
    ) {
      preparedPayload.workaround_details =
        form.values.textArea.workaroundDetails;
    } else {
      preparedPayload.workaround_details = null;
    }

    if (form.values.radio.nextUpdate === "Yes") {
      preparedPayload.next_update_time =
        form.values.dateTime.nextUpdateTime.utc;
    } else {
      preparedPayload.next_update_time = null;
    }
    if (form.values.radio.revenueImpact === "Yes") {
      preparedPayload.revenue_impact_details =
        form.values.inputBox.revenueImpactDetails;
    } else {
      preparedPayload.revenue_impact_details = null;
    }

    setPayload(preparedPayload);
    openConfirm("submit");
    return;
  };
  const handleConfirmSubmit = async () => {
    if (saving) return;

    // EXIT CONFIRM FLOW
    if (confirmPurpose === "exit") {
      setConfirmOpen(false);
      setConfirmStage("confirm");
      resetToMainScreen();
      return;
    }

    // SUBMIT CONFIRM FLOW
    if (confirmPurpose !== "submit") return;

    if (!payload) return;

    try {
      setSaving(true);
      setConfirmStage("submitting");

      await saveIncident(payload);
      const updated = await fetchAllIncidents();
      setAllIncidents(updated);

      setConfirmStage("success");

      setTimeout(() => {
        setConfirmOpen(false);
        setConfirmStage("confirm");
        setSaving(false);
        setPayload(null);

        resetToMainScreen();
      }, 1600);
    } catch (error) {
      setSaving(false);
      notifications.show({
        title: "Error",
        message: "Failed to save incident.",
        color: "red",
      });
      setConfirmOpen(false);
      setConfirmStage("confirm");
    }
  };

  const searchIncident = async (e) => {
    e.preventDefault();

    const incidentNumber = extractIncidentNumber(
      form.values.inputBox.inputNumber
    );
    if (!incidentNumber) {
      setConfirmPurpose("fetch");
      setConfirmStage("fetch-error");
      setConfirmOpen(true);
      return false;
    }

    setConfirmPurpose("fetch");
    setConfirmStage("fetching");
    setConfirmOpen(true);

    try {
      const response = await fetchIncidentByNumber(incidentNumber);
      console.log("Searching for incident:", incidentNumber);

      if (!response || response === null || response.length === 0) {
        setConfirmStage("fetch-not-found");
        return false;
      }

      console.log("Incident Data:", response);
      const incident = response[0];
      form.setValues({
        ...form.values,
        departmentName: incident.departmentName,
        disabledStatus: incident.incident_status,
        inputBox: {
          ...form.values.inputBox,
          // inputNumber: incident.incident_number || "",
          inputNumber:
            form.values.inputBox.inputNumber || incident.incident_number || "",
          subject: incident.incident_subject || "",
          incidentLink: incident.incident_link || "",
          performer: incident.performer || "",
          revenueImpactDetails: incident.revenue_impact_details || "",
        },
        radio: {
          ...form.values.radio,
          status: incident.incident_status || "",
          remainingStatus: Array.isArray(incident.remaining_status)
            ? incident.remaining_status
            : JSON.parse(incident.remaining_status || "[]"),
          incidentType: incident.incident_type || "",
          revenueImpact: incident.revenue_impact || "",
          known_issue: incident.known_issue || "",
          nextUpdate: incident.next_update || "",
          workaround: incident.workaround || "",
        },
        dropDown: {
          ...form.values.dropDown,
          reportedBy: incident.reported_by || "",
          severity: incident.severity || "",
          affectedProduct: incident.affected_product || "",
          regionImpacted: incident.region_impacted || "",
          serviceImpacted: incident.service_impacted || "",
          notificationMails: Array.isArray(incident.notification_mails)
            ? incident.notification_mails
            : JSON.parse(incident.notification_mails || "[]"),
        },
        dateTime: {
          ...form.values.dateTime,
          startTime: {
            local: incident.start_time ? new Date(incident.start_time) : null,
            utc: incident.start_time || "",
          },
          discoveredTime: {
            local: incident.discovered_time
              ? new Date(incident.discovered_time)
              : null,
            utc: incident.discovered_time || "",
          },
          nextUpdateTime: {
            local: incident.next_update_time
              ? new Date(incident.next_update_time)
              : null,
            utc: incident.next_update_time || null,
          },
          resolvedTime: {
            local: incident.resolved_time
              ? new Date(incident.resolved_time)
              : null,
            utc: incident.resolved_time || null,
          },

          resolvedWithRcaTime: {
            local: incident.resolved_with_rca_time
              ? new Date(incident.resolved_with_rca_time)
              : null,
            utc: incident.resolved_with_rca_time || null,
          },
        },
        textArea: {
          ...form.values.textArea,
          incidentDetails: incident.incident_details || "",
          statusUpdateDetails: incident.status_update_details || "",
          workaroundDetails: incident.workaround_details || "",
          resolvedDetails: incident.resolved_details || "",
          resolvedwithRcaDetails: incident.resolved_with_rca_details || "",
        },
        statusUpdate: incident.status_update_details ? true : false,
      });
      prevStatusRef.current = incident.incident_status;
      setOriginalIncident({
        ...incident,
        remaining_status: Array.isArray(incident.remaining_status)
          ? incident.remaining_status
          : JSON.parse(incident.remaining_status || "[]"),
        notification_mails: Array.isArray(incident.notification_mails)
          ? incident.notification_mails
          : JSON.parse(incident.notification_mails || "[]"),
      });
      setOldIncidentData(response);
      setConfirmOpen(false);
      setConfirmStage("confirm");
      return true;
    } catch (err) {
      if (err.message === "REQUEST_TIMEOUT") {
        // ⏱ timeout
        setConfirmStage("fetch-error");
      } else {
        // DB or unknown error
        setConfirmStage("fetch-error");
      }
      return false;
    }
  };

  const getSectionMeta = () => {
    if (incidentAction.actionType === "create") {
      if (computedStep === "knownIssue")
        return {
          icon: "fa-solid fa-circle-question",
          iconColor: "#0056f0",
          label: "Step 1 of 3",
          title: "Incident Classification",
          subtitle:
            "Tell us whether this is a known recurring issue before we begin.",
        };
      if (computedStep === "department")
        return {
          icon: "fa-solid fa-building",
          iconColor: "#7c3aed",
          label: "Step 2 of 3",
          title: "Select Department",
          subtitle: "Choose the team responsible for owning this incident.",
        };
      if (computedStep === "form")
        return {
          icon: "fa-solid fa-file-circle-plus",
          iconColor: "#0891b2",
          label: "Step 3 of 3",
          title: "Create Incident",
          subtitle:
            "Fill in the full details, severity, and impact of the incident.",
        };
    }

    if (incidentAction.actionType === "update") {
      if (computedStep === "fetchIncident")
        return {
          icon: "fa-solid fa-magnifying-glass",
          iconColor: "#0056f0",
          label: "Step 1 of 3",
          title: "Fetch Existing Incident",
          subtitle:
            "Enter the incident number to load and continue updating it.",
        };
      if (computedStep === "department")
        return {
          icon: "fa-solid fa-building-circle-arrow-right",
          iconColor: "#7c3aed",
          label: "Step 2 of 3",
          title: "Update Department",
          subtitle:
            "Reassign this incident to a different department if needed.",
        };
      if (computedStep === "form")
        return {
          icon: "fa-solid fa-pen-to-square",
          iconColor: "#0891b2",
          label: "Step 3 of 3",
          title: "Update Incident",
          subtitle:
            "Review and update the current status, details, and timeline.",
        };
    }

    return null;
  };
  const handleDeptCancel = () => {
    setDeptConfirmOpen(false);
    setPendingDepartment(null);
    setDeptFlowStep("confirm");
    setNotifyStakeholders(false);
    setDeptEmail("");
  };

  const handleDeptNext = () => {
    setDeptFlowStep("compose");
  };

  const handleDeptSend = async () => {
    const incidentNumber = extractIncidentNumber(
      form.values.inputBox.incidentLink
    );

    if (!incidentNumber) {
      notifications.show({
        title: "Missing Incident",
        message: "Please fetch the incident before notifying stakeholders.",
        color: "red",
      });
      return;
    }
    try {
      setDeptFlowStep("submitting");
      await sendDepartmentChangeEmail({
        incidentNumber: extractIncidentNumber(
          form.values.inputBox.incidentLink
        ),
        fromDepartment: form.values.departmentName,
        toDepartment: pendingDepartment,
        messageHtml: deptEmail,
      });
      setDeptProgress(100);
      setTimeout(() => setDeptFlowStep("success"), 300);
    } catch (e) {
      setDeptFlowStep("compose");
      notifications.show({
        title: "Email failed",
        message: "Department was NOT changed",
        color: "red",
      });
    }
  };

  const handleDeptConfirmDirect = () => {
    if (!pendingDepartment) return;

    form.setFieldValue("departmentName", pendingDepartment);
    form.setFieldValue("dropDown.affectedProduct", null);
    form.setFieldValue("dropDown.notificationMails", []);

    setDepartmentLocked(true); // 🔒 LOCK IT HERE
    handleDeptCancel();
  };

  return (
    <>
      {!incidentAction.showForm && (
        <div
          className="w-full flex flex-col items-center justify-center px-6 py-10 gap-10"
          style={{ minHeight: "calc(100vh - 200px)" }}
        >
          {/* Welcome heading */}
          <div className="text-center">
            <p className="text-xs font-semibold text-[#0056f0] uppercase tracking-[3px] mb-2">
              Incident Management
            </p>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">
              What would you like to do?
            </h1>
            <p className="text-sm text-slate-400">
              Choose an action below to get started
            </p>
          </div>

          {/* Action cards */}
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 cursor-pointer">
            {/* CREATE CARD */}
            <div
              className="group relative flex flex-col items-start justify-between
          bg-white rounded-2xl p-8 gap-5 border border-slate-200/60
          hover:border-[#0056f0]/30 transition-all duration-300
          hover:shadow-[0_20px_50px_rgba(0,86,240,0.12)] hover:-translate-y-1"
              onClick={() =>
                setIncidentAction({ showForm: true, actionType: "create" })
              }
            >
              <div
                className="w-14 h-14 rounded-2xl bg-[#0056f0]/8 flex items-center justify-center
          group-hover:bg-[#0056f0] group-hover:scale-110 transition-all duration-300"
              >
                <i className="fa-solid fa-plus text-[#0056f0] group-hover:text-white transition-colors text-xl" />
              </div>
              <div>
                <p className="font-bold text-lg text-slate-800 mb-1">
                  Create Incident
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Log a new incident with severity, impact, timeline and
                  ownership
                </p>
              </div>
              <div
                className="flex items-center gap-2 text-[#0056f0] text-xs font-semibold
          opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-300"
              >
                <span>Get started</span>
                <i className="fa-solid fa-arrow-right text-[10px]" />
              </div>
              <div
                className="absolute top-0 left-8 right-8 h-[3px] rounded-b-full
          bg-gradient-to-r from-[#0056f0] to-[#00c6ff]
          scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
              />
            </div>

            {/* UPDATE CARD */}
            <div
              className="group relative flex flex-col items-start justify-between
          bg-white rounded-2xl p-8 gap-5 border border-slate-200/60
          hover:border-[#7c3aed]/30 transition-all duration-300
          hover:shadow-[0_20px_50px_rgba(124,58,237,0.12)] hover:-translate-y-1"
              onClick={() =>
                setIncidentAction({ showForm: true, actionType: "update" })
              }
            >
              <div
                className="w-14 h-14 rounded-2xl bg-[#7c3aed]/8 flex items-center justify-center
          group-hover:bg-[#7c3aed] group-hover:scale-110 transition-all duration-300"
              >
                <i className="fa-solid fa-pen-to-square text-[#7c3aed] group-hover:text-white transition-colors text-xl" />
              </div>
              <div>
                <p className="font-bold text-lg text-slate-800 mb-1">
                  Update Ongoing Incident
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Send updates for an existing open incident
                </p>
              </div>
              <div
                className="flex items-center gap-2 text-[#7c3aed] text-xs font-semibold
          opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-300"
              >
                <span>Continue</span>
                <i className="fa-solid fa-arrow-right text-[10px]" />
              </div>
              <div
                className="absolute top-0 left-8 right-8 h-[3px] rounded-b-full
          bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]
          scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
              />
            </div>
          </div>

          {/* Quick tips */}
          <div className="w-full max-w-3xl grid grid-cols-3 gap-4 mt-2">
            <div className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3 border border-slate-100">
              <i className="fa-solid fa-bolt text-amber-400 text-sm" />
              <span className="text-xs text-slate-500">
                Multi-account impact triggers incident classification
              </span>{" "}
            </div>
            <div className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3 border border-slate-100">
              <i className="fa-solid fa-envelope text-[#0056f0] text-sm" />
              <span className="text-xs text-slate-500">
                Stakeholders are notified via email
              </span>
            </div>
            <div className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3 border border-slate-100">
              <i className="fa-solid fa-clock-rotate-left text-emerald-500 text-sm" />
              <span className="text-xs text-slate-500">
                Full incident history is tracked
              </span>
            </div>
          </div>

          {/* STATS */}
          <div className="fixed bottom-0 left-0 w-full bg-transparent z-40">
            <div className="mx-auto max-w-6xl px-4 pb-4">
              <StatsOverview incidents={allIncidents} />
            </div>
          </div>
        </div>
      )}
      {incidentAction.showForm && (
        <div
          className="w-full
max-w-[1800px] mx-auto bg-[#f7f8fb] rounded-2xl
mt-2 mb-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)]
h-[calc(100vh-110px)] flex flex-col overflow-hidden "
        >
          {/* Main grid */}
          <div
            className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr]
gap-0 flex-1 min-h-0"
          >
            {/* LEFT — Stepper */}
            <aside className="p-4 flex flex-col justify-start gap-4 bg-[#002852] overflow-hidden">
              {/* ── Back button (now lives inside the sidebar) ── */}
              <button
                className="imap-back-btn group relative flex items-center gap-3 w-full px-4 py-3 mb-2 rounded-2xl cursor-pointer overflow-hidden outline-none transition-all duration-400"
                onClick={prevStep}
                type="button"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(0,86,240,0.08) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="imap-back-shimmer absolute inset-0 pointer-events-none" />
                <div
                  className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 group-hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <i className="fa-solid fa-arrow-left text-sm text-white/60 group-hover:text-white transition-all duration-300" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-semibold leading-none mb-1 transition-colors duration-300 group-hover:text-white/50">
                    {formStep === 1 ? "Navigate" : `Step ${formStep} of 3`}
                  </span>
                  <span className="text-sm font-bold text-white/70 transition-all duration-300 group-hover:text-white">
                    {formStep === 1 ? "Back to Dashboard" : "Previous Step"}
                  </span>
                </div>
                <div
                  className="ml-auto w-2.5 h-2.5 rounded-full transition-all duration-500 group-hover:scale-150"
                  style={{ background: "rgba(0,86,240,0.4)" }}
                />
              </button>
              {/* Stepper */}
              <div className="mb-4">
                <h2 className="text-xs font-medium text-[#7bcdff] mb-4 uppercase tracking-wider">
                  Progress
                </h2>
                <div className="space-y-4">
                  {/* STEP 1 */}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="relative w-8 h-8">
                        {formStep === 1 && (
                          <div className="absolute inset-0 rounded-full bg-[#0056f0] animate-ping opacity-40" />
                        )}
                        <div
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            formStep > 1
                              ? "bg-[#00f0d2]"
                              : formStep === 1
                                ? "bg-[#0056f0]"
                                : "bg-white/10 border border-white/20"
                          }`}
                        >
                          {formStep > 1 ? (
                            <Check
                              className="w-4 h-4 text-[#002852]"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <span
                              className={`text-xs font-medium ${formStep === 1 ? "text-white" : "text-white/40"}`}
                            >
                              1
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-px h-8 mt-1 ${formStep > 1 ? "bg-[#00f0d2]" : "bg-white/20"}`}
                      />
                    </div>
                    <div className="pt-1.5">
                      <p
                        className={`text-sm font-bold ${
                          formStep === 1
                            ? "text-white"
                            : formStep > 1
                              ? "text-[#7bcdff]"
                              : "text-white/40"
                        }`}
                      >
                        {incidentAction.actionType === "update"
                          ? "Fetch Incident"
                          : "Known Issue"}
                      </p>
                    </div>
                  </div>

                  {/* STEP 2 */}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="relative w-8 h-8">
                        {formStep === 2 && (
                          <div className="absolute inset-0 rounded-full bg-[#0056f0] animate-ping opacity-40" />
                        )}
                        <div
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            formStep > 2
                              ? "bg-[#00f0d2]"
                              : formStep === 2
                                ? "bg-[#0056f0]"
                                : "bg-white/10 border border-white/20"
                          }`}
                        >
                          {formStep > 2 ? (
                            <Check
                              className="w-4 h-4 text-[#002852]"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <span
                              className={`text-xs font-medium ${formStep === 2 ? "text-white" : "text-white/40"}`}
                            >
                              2
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-px h-8 mt-1 ${formStep > 2 ? "bg-[#00f0d2]" : "bg-white/20"}`}
                      />
                    </div>
                    <div className="pt-1.5">
                      <p
                        className={`text-sm font-bold ${
                          formStep === 2
                            ? "text-white"
                            : formStep > 2
                              ? "text-[#7bcdff]"
                              : "text-white/40"
                        }`}
                      >
                        Department
                      </p>
                    </div>
                  </div>

                  {/* STEP 3 */}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="relative w-8 h-8">
                        {formStep === 3 && (
                          <div className="absolute inset-0 rounded-full bg-[#0056f0] animate-ping opacity-40" />
                        )}
                        <div
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            formStep === 3
                              ? "bg-[#0056f0]"
                              : "bg-white/10 border border-white/20"
                          }`}
                        >
                          <span
                            className={`text-xs font-medium ${formStep === 3 ? "text-white" : "text-white/40"}`}
                          >
                            3
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-1.5">
                      <p
                        className={`text-sm font-bold ${formStep === 3 ? "text-white" : "text-white/40"}`}
                      >
                        Incident Form
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {oldIncidentData && (
                <div className="mt-auto flex flex-col gap-4">
                  <IncidentData incidentData={oldIncidentData} />

                  {/* Current Incident Info Card */}
                  <div
                    className="rounded-xl p-4 border border-white/10"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fa-solid fa-circle-info text-[#7bcdff] text-xs" />
                      <span className="text-[10px] font-semibold text-[#7bcdff] uppercase tracking-widest">
                        Current Incident
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">Incident ID</span>
                      <span className="text-sm font-bold text-white">
                        #{oldIncidentData[0]?.display_id || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">Priority</span>
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            form.values.dropDown.severity === "Emergency"
                              ? "rgba(239,68,68,0.15)"
                              : form.values.dropDown.severity === "High"
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(59,130,246,0.15)",
                          color:
                            form.values.dropDown.severity === "Emergency"
                              ? "#f87171"
                              : form.values.dropDown.severity === "High"
                                ? "#fbbf24"
                                : "#60a5fa",
                        }}
                      >
                        {form.values.dropDown.severity || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Created</span>
                      <span className="text-sm font-semibold text-white/70">
                        {oldIncidentData[0]?.created_at
                          ? new Date(
                              oldIncidentData[0].created_at
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </aside>

            {/* RIGHT — FORM */}
            <section className="w-full overflow-y-auto p-2 min-h-0">
              <Box
                mx="auto"
                p="xs"
                radius="md"
                shadow="lg"
                className="w-full flex flex-col items-center h-full"
              >
                {(() => {
                  const meta = getSectionMeta();
                  if (!meta) return null;
                  return (
                    <div className="w-full mb-6 px-2">
                      <div className="flex items-center gap-3 mb-3">
                        {/* Icon badge */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: meta.iconColor + "18" }}
                        >
                          <i
                            className={`${meta.icon} text-base`}
                            style={{ color: meta.iconColor }}
                          />
                        </div>
                        {/* Step label pill */}
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: meta.iconColor + "18",
                            color: meta.iconColor,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      {/* Title */}
                      <h1 className="text-2xl font-bold text-slate-800 mb-1">
                        {meta.title}
                      </h1>
                      {/* Subtitle */}
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {meta.subtitle}
                      </p>
                      {/* Accent line */}
                      <div
                        className="mt-4 h-px w-full rounded-full"
                        style={{
                          background: `linear-gradient(to right, ${meta.iconColor}40, transparent)`,
                        }}
                      />
                    </div>
                  );
                })()}{" "}
                <form className="w-full h-full overflow-y-auto p-2 flex flex-col items-start gap-3">
                  {" "}
                  {/* Already Incident */}
                  {/* ======================= ✅ STEP 1 ======================= */}
                  {/* 
                    <RadioBtn
                      data={["Yes", "No"]}
                      radioHead="Already Incident"
                      horizontal={true}
                      inputProps={{
                        ...form.getInputProps("radio.inputIncident"), // keeps value, error, onBlur, etc.
                        onChange: (val) =>
                          handleChange("radio.inputIncident", val), // replace default onChange
                      }}
                    /> */}
                  {computedStep === "fetchIncident" && (
                    <div className="w-full h-full flex flex-col justify-center items-center gap-6 px-4">
                      {/* Visual card */}
                      <div
                        className="w-full max-w-md bg-white rounded-2xl border border-slate-200/60 p-8
      shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col items-center gap-6"
                      >
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-2xl bg-[#7c3aed]/8 flex items-center justify-center">
                          <i className="fa-solid fa-magnifying-glass text-[#7c3aed] text-2xl" />
                        </div>

                        {/* Title */}
                        <div className="text-center">
                          <h2 className="text-sm font-bold text-slate-800 mb-1">
                            Find your incident
                          </h2>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Enter the incident number or Salesforce Case ID to
                            load it
                          </p>
                        </div>

                        {/* Input */}
                        {incidentAction.actionType === "update" && (
                          <div className="w-full">
                            <InputBtn
                              horizontalLayout={false}
                              title="Incident Number"
                              width="100%"
                              placeholder="e.g. 5001X00001abc or Case ID"
                              isBtn={true}
                              onClick={async (e) => {
                                e.preventDefault();
                                const result = form.validateField(
                                  "inputBox.inputNumber"
                                );
                                if (result.hasError) return;
                                const success = await searchIncident(e);
                                if (success) nextStep();
                              }}
                              inputProps={{
                                ...form.getInputProps("inputBox.inputNumber"),
                                onChange: (e) =>
                                  handleChange(
                                    "inputBox.inputNumber",
                                    e.target.value
                                  ),
                              }}
                            />
                          </div>
                        )}

                        {/* Help callout */}
                        <div className="w-full flex items-start gap-3 bg-[#7c3aed]/5 rounded-xl px-4 py-3">
                          <i className="fa-solid fa-circle-info text-[#7c3aed] text-sm mt-0.5" />
                          <p className="text-xs text-slate-500 leading-relaxed">
                            <span className="font-semibold text-slate-600">
                              Where to find it:
                            </span>{" "}
                            Copy the incident number from Salesforce, or use the
                            Case URL directly.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* ======================= ✅ STEP 2 ======================= */}
                  {/* ✅ KNOWN ISSUE (RADIO + DISABLED WHEN FETCHED) */}
                  {computedStep === "knownIssue" && (
                    <div className="w-full h-full flex flex-col justify-center items-center gap-6 px-4">
                      {/* Visual card */}
                      <div
                        className="w-full max-w-md bg-white rounded-2xl border border-slate-200/60 p-8
      shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col items-center gap-6"
                      >
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-2xl bg-[#0056f0]/8 flex items-center justify-center">
                          <i className="fa-solid fa-circle-question text-[#0056f0] text-2xl" />
                        </div>

                        {/* Question */}
                        <div className="text-center">
                          <h2 className="text-sm font-bold text-slate-800 mb-1">
                            Is this a known issue?
                          </h2>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Known issues follow a shorter lifecycle: Ongoing →
                            Resolved
                          </p>
                        </div>

                        {/* Radio */}
                        <div className="w-full flex justify-center">
                          <RadioBtn
                            data={["Yes", "No"]}
                            radioHead="Known Issue?"
                            horizontal={true}
                            inputProps={{
                              ...form.getInputProps("radio.known_issue"),
                              onChange: (val) =>
                                handleChange("radio.known_issue", val),
                            }}
                          />
                        </div>

                        {originalIncident && (
                          <p className="text-xs text-slate-300 italic">
                            Locked — this incident was fetched from the
                            database.
                          </p>
                        )}

                        {/* Info callout */}
                        <div className="w-full flex items-start gap-3 bg-[#0056f0]/5 rounded-xl px-4 py-3">
                          <i className="fa-solid fa-lightbulb text-[#0056f0] text-sm mt-0.5" />
                          <p className="text-xs text-slate-500 leading-relaxed">
                            <span className="font-semibold text-slate-600">
                              Tip:
                            </span>{" "}
                            Select "Yes" for recurring or previously identified
                            issues. Select "No" for new or unclassified
                            incidents.
                          </p>
                        </div>
                      </div>

                      {/* Continue button */}
                      <ActionBtn
                        btnText="Continue"
                        type="button"
                        onClick={() => {
                          const result =
                            form.validateField("radio.known_issue");
                          if (result.hasError) return;
                          nextStep();
                        }}
                      />
                    </div>
                  )}
                  {/* ======================= ✅ STEP 3 — DEPARTMENT SELECTION (CARD UI) ======================= */}
                  {computedStep === "department" && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-8">
                      {/* <h2 className="text-2xl font-semibold text-slate-800">
                        Select Department
                      </h2> */}

                      <div className="grid grid-cols-3 gap-6 mb-16 place-items-center">
                        {" "}
                        {formTabs.map((dept) => (
                          <DepartmentCard
                            key={dept}
                            title={dept}
                            active={form.values.departmentName === dept}
                            disabled={departmentLocked}
                            onClick={() => {
                              if (departmentLocked) return;
                              // CREATE → no confirmation needed
                              if (incidentAction.actionType === "create") {
                                handleChange("departmentName", dept);
                                form.setFieldValue(
                                  "dropDown.affectedProduct",
                                  null
                                );
                                form.setFieldValue(
                                  "dropDown.notificationMails",
                                  []
                                );
                                return;
                              }
                              // UPDATE + department unchanged → do nothing
                              if (form.values.departmentName === dept) return;
                              setPendingDepartment(dept);
                              setDeptFlowStep("confirm"); // 🔥 step 1
                              setDeptConfirmOpen(true);
                            }}
                          />
                        ))}
                      </div>
                      {/* ✅ CONTINUE BUTTON */}
                      <ActionBtn
                        btnText="Continue"
                        onClick={() => {
                          if (!form.values.departmentName) {
                            alert("Please select a department");
                            return;
                          }
                          nextStep();
                        }}
                      />
                    </div>
                  )}
                  {/* ======================= ✅ STEP 4 ======================= */}
                  {/* ✅ FULL FORM (UNCHANGED FIELDS) */}
                  {computedStep === "form" && (
                    <div className="w-full h-full flex flex-col items-start overflow-y-auto gap-4">
                      <div className="w-full flex items-center gap-3 mt-2 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-[#0056f0]/10 flex items-center justify-center">
                          <i className="fa-solid fa-info text-[#0056f0] text-xs" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Basic Information
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      {/* Subject input */}
                      <div style={{ position: "relative", width: "100%" }}>
                        <InputBtn
                          horizontalLayout={false}
                          title="Subject: "
                          width="100%"
                          placeholder="Enter Subject"
                          isBtn={false}
                          inputProps={{
                            ...form.getInputProps("inputBox.subject"),
                            onChange: (e) =>
                              handleChange("inputBox.subject", e.target.value),
                          }}
                        />

                        {suggestions.length > 0 && (
                          <div
                            className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200
    rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] z-[9999] max-h-[200px] overflow-y-auto"
                          >
                            {suggestions.map((item) => (
                              <div
                                key={item.id}
                                className="px-3 py-2.5 cursor-pointer text-sm text-slate-600
          hover:bg-[#0056f0]/5 hover:text-[#0056f0] transition-colors
          border-b border-slate-100 last:border-b-0"
                                onClick={() => {
                                  form.setFieldValue(
                                    "inputBox.subject",
                                    item.incident_subject
                                  );
                                  setSuggestions([]);
                                }}
                              >
                                {item.incident_subject}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <IncidentTxtBox
                        context="incident_details"
                        inputProps={{
                          ...form.getInputProps("textArea.incidentDetails"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("textArea.incidentDetails", val), // replace default onChange
                        }}
                        startingLine=""
                      />
                      <div className="w-full flex items-center gap-3 mt-4 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-[#e53e3e]/10 flex items-center justify-center">
                          <i className="fa-solid fa-signal text-[#e53e3e] text-xs" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Status & Resolution
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      {/* Status Radio Group */}
                      <RadioBtn
                        data={Object.keys(statusGradientMap)}
                        radioHead="Status"
                        inputProps={{
                          ...form.getInputProps("radio.status"), // keeps value, error, onBlur, etc.
                          onChange: (val) => handleChange("radio.status", val), // replace default onChange
                        }}
                        // isDisabled={(status) => {
                        //   if (form.values.disabledStatus === "Not an Issue") {
                        //     return status !== "Not an Issue";
                        //   }
                        //   return statusKeys.indexOf(status) < dbIndex;
                        // }} // function to disable previous
                        isDisabled={(status) => {
                          const current = form.values.disabledStatus;

                          if (!current) return false;

                          // If user already marked Not an Issue → lock everything else
                          if (current === "Not an Issue") {
                            return status !== "Not an Issue";
                          }

                          // ❌ Not an Issue NOT allowed after resolution
                          if (status === "Not an Issue") {
                            return ["Resolved", "Resolved with RCA"].includes(
                              current
                            );
                          }

                          // Normal lifecycle locking
                          const currentIndex = STATUS_FLOW.indexOf(current);
                          const statusIndex = STATUS_FLOW.indexOf(status);

                          if (statusIndex === -1) return false;

                          return statusIndex < currentIndex;
                        }}
                      />
                      {(form.values.radio.status === "Resolved" ||
                        form.values.radio.status === "Resolved with RCA") && (
                        <IncidentTxtBox
                          context="resolution"
                          inputProps={{
                            ...form.getInputProps("textArea.resolvedDetails"),
                            onChange: (val) =>
                              handleChange("textArea.resolvedDetails", val),
                          }}
                          startingLine="Resolved Details:"
                        />
                      )}
                      {form.values.radio.status === "Resolved with RCA" && (
                        <IncidentTxtBox
                          context="resolutionRca"
                          inputProps={{
                            ...form.getInputProps(
                              "textArea.resolvedwithRcaDetails"
                            ),
                            onChange: (val) =>
                              handleChange(
                                "textArea.resolvedwithRcaDetails",
                                val
                              ),
                          }}
                          startingLine="Resolved with RCA Details:"
                        />
                      )}
                      <div className="flex flex-col w-full items-start gap-3">
                        <button
                          type="button"
                          className={`imap-toggle-btn${form.values.statusUpdate ? " active" : ""}`}
                          onClick={() =>
                            form.setFieldValue(
                              "statusUpdate",
                              !form.values.statusUpdate
                            )
                          }
                        >
                          <i
                            className={`fa-solid ${form.values.statusUpdate ? "fa-minus" : "fa-plus"}`}
                            style={{ fontSize: "10px" }}
                          />
                          <span>
                            {form.values.statusUpdate
                              ? "Remove Status Update"
                              : "Add Status Update"}
                          </span>
                        </button>
                        {form.values.statusUpdate && (
                          <IncidentTxtBox
                            context="status_update"
                            inputProps={{
                              ...form.getInputProps(
                                "textArea.statusUpdateDetails"
                              ), // keeps value, error, onBlur, etc.
                              onChange: (val) =>
                                handleChange(
                                  "textArea.statusUpdateDetails",
                                  val
                                ), // replace default onChange
                            }}
                            startingLine=""
                          />
                        )}
                      </div>
                      <RadioBtn
                        data={["Yes", "No"]}
                        radioHead="Workaround Provided"
                        inputProps={{
                          ...form.getInputProps("radio.workaround"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("radio.workaround", val), // replace default onChange
                        }}
                      />
                      {form.values.radio.workaround === "Yes" && (
                        <IncidentTxtBox
                          context="workaround"
                          inputProps={{
                            ...form.getInputProps("textArea.workaroundDetails"), // keeps value, error, onBlur, etc.
                            onChange: (val) =>
                              handleChange("textArea.workaroundDetails", val), // replace default onChange
                          }}
                          startingLine="Workaround Details:"
                        />
                      )}
                      <div className="w-full flex items-center gap-3 mt-4 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center">
                          <i className="fa-solid fa-tags text-[#7c3aed] text-xs" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Classification
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <DropdownBtn
                        title="Reported By: "
                        data={[
                          "Product/RnD",
                          "PS/Support",
                          "Customer",
                          "Business",
                        ]}
                        inputProps={{
                          ...form.getInputProps("dropDown.reportedBy"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("dropDown.reportedBy", val), // replace default onChange
                        }}
                      />
                      <DropdownBtn
                        title="Severity: "
                        data={["Emergency", "High", "Standard"]}
                        inputProps={{
                          ...form.getInputProps("dropDown.severity"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("dropDown.severity", val), // replace default onChange
                        }}
                      />
                      <DropdownBtn
                        title="Affected Product: "
                        data={
                          groupedProductOptions.find(
                            (item) => item.group === form.values.departmentName
                          )
                            ? groupedProductOptions.find(
                                (item) =>
                                  item.group === form.values.departmentName
                              ).items
                            : groupedProductOptions
                        }
                        inputProps={{
                          ...form.getInputProps("dropDown.affectedProduct"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("dropDown.affectedProduct", val), // replace default onChange
                        }}
                      />
                      <MultiSelectEmails
                        options={(() => {
                          const allowedGroups = departmentToGroupsMap[form.values.departmentName] || [];
                          // Filter options to only show groups relevant to current department.
                          // This prevents cross-group duplicate email values in the dropdown
                          // (e.g. an email in both Publisher + Advertiser groups showing twice).
                          const filtered = form.values.dropDown.allEmailOptions.filter(opt =>
                            allowedGroups.includes(opt.group)
                          );
                          // Deduplicate emails across the filtered groups so no value appears twice
                          const seen = new Set();
                          return filtered.map(group => ({
                            ...group,
                            emails: group.emails.filter(email => {
                              if (seen.has(email)) return false;
                              seen.add(email);
                              return true;
                            }),
                          })).filter(group => group.emails.length > 0);
                        })()}
                        value={form.values.dropDown.notificationMails}
                        onChange={(val) =>
                          handleChange("dropDown.notificationMails", val)
                        }
                        title="Mail To : "
                      />

                      <RadioBtn
                        data={[
                          "Downtime",
                          "Service Interruption",
                          "Maintainence",
                        ]}
                        radioHead="Incident Type"
                        inputProps={{
                          ...form.getInputProps("radio.incidentType"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("radio.incidentType", val), // replace default onChange
                        }}
                      />
                      <div className="w-full flex items-center gap-3 mt-4 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-[#0891b2]/10 flex items-center justify-center">
                          <i className="fa-regular fa-clock text-[#0891b2] text-xs" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Timeline
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <DateTimeSelector
                        value={form.values.dateTime.startTime.local}
                        onChange={(val) =>
                          handleDateTimeChange("startTime", val)
                        }
                        utcValue={form.values.dateTime.startTime.utc}
                        label="Started Time (UTC) :"
                        checkBox={false}
                        inputProps={form.getInputProps("dateTime.startTime")}
                      />

                      <DateTimeSelector
                        value={form.values.dateTime.discoveredTime.local}
                        onChange={(val) =>
                          handleDateTimeChange("discoveredTime", val)
                        }
                        utcValue={form.values.dateTime.discoveredTime.utc}
                        label="Support Discovered Time (UTC) :"
                        checkBox={false}
                        inputProps={form.getInputProps(
                          "dateTime.discoveredTime"
                        )}
                      />
                      {(form.values.radio.status === "Resolved" ||
                        form.values.radio.status === "Resolved with RCA") && (
                        <DateTimeSelector
                          value={form.values.dateTime.resolvedTime.local}
                          onChange={(val) =>
                            handleDateTimeChange("resolvedTime", val)
                          }
                          utcValue={form.values.dateTime.resolvedTime.utc}
                          label="Resolved Time (UTC) :"
                          checkBox={false}
                          inputProps={form.getInputProps(
                            "dateTime.resolvedTime"
                          )}
                        />
                      )}
                      {form.values.radio.status === "Resolved with RCA" && (
                        <DateTimeSelector
                          value={form.values.dateTime.resolvedWithRcaTime.local}
                          onChange={(val) =>
                            handleDateTimeChange("resolvedWithRcaTime", val)
                          }
                          utcValue={
                            form.values.dateTime.resolvedWithRcaTime.utc
                          }
                          label="Resolved with RCA Time (UTC) :"
                          checkBox={false}
                          inputProps={form.getInputProps(
                            "dateTime.resolvedWithRcaTime"
                          )}
                        />
                      )}
                      <div className="w-full flex items-center gap-3 mt-4 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-[#d97706]/10 flex items-center justify-center">
                          <i className="fa-solid fa-chart-line text-[#d97706] text-xs" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Impact & Details
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <RadioBtn
                        data={["Yes", "No"]}
                        radioHead="Revenue Impact"
                        inputProps={{
                          ...form.getInputProps("radio.revenueImpact"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("radio.revenueImpact", val), // replace default onChange
                        }}
                      />

                      {form.values.radio.revenueImpact === "Yes" && (
                        <div className="imap-textarea-field">
                          <label className="imap-field-label">
                            Impacted Revenue
                            <span className="imap-required">*</span>
                          </label>
                          <Textarea
                            placeholder="Describe the financial impact in detail..."
                            radius="md"
                            size="md"
                            autosize
                            w="100%"
                            minRows={3}
                            styles={{
                              input: {
                                border: "1.5px solid #e2e8f0",
                                background: "#fff",
                                borderRadius: "10px",
                                fontSize: "13px",
                                fontFamily: "'Poppins', sans-serif",
                                transition:
                                  "border-color 0.2s, box-shadow 0.2s",
                              },
                            }}
                            {...form.getInputProps(
                              "inputBox.revenueImpactDetails"
                            )}
                            onChange={(e) =>
                              handleChange(
                                "inputBox.revenueImpactDetails",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )}

                      <DropdownBtn
                        title="Region Impacted: "
                        data={[
                          "Global",
                          "APAC",
                          "EMEA",
                          "US & LATAM",
                          "Optimize",
                          "Self-Service",
                        ]}
                        inputProps={{
                          ...form.getInputProps("dropDown.regionImpacted"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("dropDown.regionImpacted", val), // replace default onChange
                        }}
                      />

                      <DropdownBtn
                        title="Impact Level: "
                        data={[
                          "Reporting",
                          "Partial Functionality",
                          "Service Degradation",
                          "Intermittent",
                          "Complete Outage",
                          "No Impact (Informational)",
                        ]}
                        inputProps={{
                          ...form.getInputProps("dropDown.serviceImpacted"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("dropDown.serviceImpacted", val), // replace default onChange
                        }}
                      />
                      <div className="w-full flex items-center gap-3 mt-4 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-[#059669]/10 flex items-center justify-center">
                          <i className="fa-solid fa-link text-[#059669] text-xs" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Ownership & Links
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <InputBtn
                        horizontalLayout={false}
                        title="Incident Link: "
                        width="100%"
                        placeholder="Enter Incident Link"
                        isBtn={false}
                        inputProps={{
                          ...form.getInputProps("inputBox.incidentLink"), // keeps value, error, onBlur, etc.
                          disabled: !!originalIncident, // ✅ LOCK after fetch
                          readOnly: !!originalIncident, // extra safety
                          onChange: (e) =>
                            handleChange(
                              "inputBox.incidentLink",
                              e.target.value
                            ), // replace default onChange
                        }}
                      />
                      <SearchableInput
                        title="Performer: "
                        width="100%"
                        placeholder="Enter your Taboola Email Id"
                        data={performers}
                        inputProps={form.getInputProps("inputBox.performer")}
                      />
                      <RadioBtn
                        data={["Yes", "No"]}
                        radioHead="Update Available"
                        inputProps={{
                          ...form.getInputProps("radio.nextUpdate"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("radio.nextUpdate", val), // replace default onChange
                        }}
                      />
                      {form.values.radio.nextUpdate === "Yes" && (
                        <DateTimeSelector
                          value={form.values.dateTime.nextUpdateTime.local}
                          onChange={(val) =>
                            handleDateTimeChange("nextUpdateTime", val)
                          }
                          utcValue={form.values.dateTime.nextUpdateTime.utc}
                          label="Next Update Time (UTC) :"
                          checkBox={true}
                          inputProps={form.getInputProps(
                            "dateTime.nextUpdateTime"
                          )}
                        />
                      )}
                      <Box
                        w="100%"
                        display="flex"
                        style={{ justifyContent: "center", gap: "2rem" }}
                        mt="md"
                      >
                        <ActionBtn
                          btnText="Preview Email"
                          onClick={(e) => {
                            e.preventDefault();
                            const result = form.validate();

                            if (result.hasErrors) {
                              notifications.show({
                                title: "Validation Error",
                                message:
                                  "Please fix the highlighted fields before previewing.",
                                color: "red",
                              });
                              return;
                            }
                            form.setFieldValue("modalOpen", true);
                          }}
                          btnFont="animated_images"
                        />
                        <ActionBtn
                          btnText="Submit"
                          btnFont="save"
                          btnStyle=""
                          type="button"
                          onClick={handleSubmit}
                        />
                      </Box>
                    </div>
                  )}
                </form>
                <Modal
                  opened={form.values.modalOpen}
                  onClose={() => form.setFieldValue("modalOpen", false)}
                  styles={{
                    content: {
                      "--modal-size": "min(90vw, 900px)",
                      // min( viewport width * 90%, max width 900px )
                    },
                  }}
                >
                  <EmailTemplateLayout
                    data={{
                      ...form.values,
                      history: oldIncidentData || [],
                    }}
                    extractIncidentNumber={extractIncidentNumber}
                  />
                </Modal>
                <ConfirmSubmitModal
                  opened={confirmOpen}
                  stage={confirmStage}
                  loading={saving}
                  submitProgress={submitProgress}
                  purpose={confirmPurpose}
                  onCancel={() => {
                    setConfirmOpen(false);
                    setConfirmStage("confirm");
                  }}
                  onConfirm={handleConfirmSubmit}
                />
                <DepartmentChangeFlow
                  opened={deptConfirmOpen}
                  step={deptFlowStep}
                  progress={deptProgress}
                  fromDepartment={form.values.departmentName}
                  toDepartment={pendingDepartment}
                  notifyStakeholders={notifyStakeholders}
                  setNotifyStakeholders={setNotifyStakeholders}
                  emailValue={deptEmail}
                  onEmailChange={setDeptEmail}
                  onCancel={handleDeptCancel}
                  onConfirmDirect={handleDeptConfirmDirect}
                  onNext={handleDeptNext}
                  onSend={handleDeptSend}
                  disabled={departmentLocked}
                />
              </Box>
            </section>
          </div>
        </div>
      )}
    </>
  );
};

export default Bar;
