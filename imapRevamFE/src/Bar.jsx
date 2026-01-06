import { useEffect, useState } from "react";
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
import EmailTemplateLayout from "./EmailTemplateLayout";
import { Box, Title, Group, Textarea, Modal, Switch } from "@mantine/core";
import SearchableInput from "./components/SearchableInput";
import { notifications } from "@mantine/notifications";
import {
  fetchIncidentByNumber,
  fetchAllIncidents,
  saveIncident,
} from "./services/incidentOperations";
import DepartmentCard from "./components/DepartmentCard";
import IncidentData from "./components/IncidentData";
import ConfirmSubmitModal from "./components/ConfirmSubmitModal";
import StatsOverview from "./components/StatsOverview";

const Bar = () => {
  const formTabs = ["General", "Publisher", "Advertiser", "Header Bidding"];
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

  const statusGradientMapNormal = {
    Suspected: {
      gradient: "#0056f0", // blue
      iconClass: "fa-solid fa-magnifying-glass",
    },
    "Not an Issue": {
      gradient: "", // blue
      iconClass: "",
    },
    Ongoing: {
      gradient: "#e53e3e", // red
      iconClass: "fa-solid fa-circle",
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

  const STATUS_FLOW = ["Suspected", "Ongoing", "Resolved", "Resolved with RCA"];

  function isFormChanged() {
    if (!originalIncident) return true;

    const current = form.values;

    // inputBox
    if (
      // (current.inputBox.inputNumber || "") !==
      //   (originalIncident.incident_number || "") ||
      (current.inputBox.subject || "") !== (originalIncident.subject || "") ||
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
      (current.radio.status || "") !== (originalIncident.status || "") ||
      (current.radio.incidentType || "") !==
        (originalIncident.incident_type || "") ||
      (current.radio.revenueImpact || "") !==
        (originalIncident.revenue_impact || "") ||
      (current.radio.nextUpdate || "") !==
        (originalIncident.next_update || "") ||
      ((current.radio.workaround || "") !==
        (originalIncident.workaround || "") ||
        current.radio.known_issue ||
        "") !== (originalIncident.known_issue || "")
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
          values.radio.revenueImpact === "Yes" && value.trim().length < 5
            ? "Please provide revenue impact details (min 5 characters)"
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
        statusUpdateDetails: (value, values) =>
          values.statusUpdate === true && value.trim().length < 5
            ? "Please provide status update (min 5 characters)"
            : null,
        workaroundDetails: (value, values) =>
          values.radio.workaround === "Yes" && value.trim().length < 5
            ? "Please provide workaround update (min 5 characters)"
            : null,
        resolvedDetails: (value, values) =>
          values.radio.status === "Resolved" && value.trim().length < 5
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
    if (field === "radio.status") {
      // Case 1: Not an Issue → no timeline
      if (value === "Not an Issue") {
        form.setFieldValue("radio.remainingStatus", []);
        return;
      }
      const isKnownIssue = form.values.radio.known_issue === "Yes";
      const flow = isKnownIssue
        ? Object.keys(statusGradientMapKnownIssue)
        : STATUS_FLOW;
      // Case 2: status belongs to lifecycle
      const index = flow.indexOf(value);

      if (index === -1) {
        form.setFieldValue("radio.remainingStatus", []);
        return;
      }

      const remainingStatusValues = flow
        .slice(index) // INCLUDE selected status
        .map((status) => ({
          statusName: status,
          color: statusGradientMap[status]?.gradient,
          icons: statusGradientMap[status]?.iconClass,
        }));

      form.setFieldValue("radio.remainingStatus", remainingStatusValues);
    }
  };
  const filterSuggestions = (value) => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = allIncidents
      .filter((i) => i.subject?.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8);

    setSuggestions(filtered);
  };
  const handleDateTimeChange = (fieldKey, date) => {
    if (!date || isNaN(new Date(date).getTime())) return;

    const fullDate = new Date(date);

    form.setFieldValue(`dateTime.${fieldKey}`, {
      local: fullDate,
      utc: fullDate.toISOString(), // keep UTC consistent
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
    if (!selectedItem) return;

    const group = groupedProductOptions.find((g) =>
      g.items.includes(selectedItem)
    )?.group;

    const emailOption = form.values.dropDown.allEmailOptions.find(
      (item) => item.group === group
    );

    if (emailOption) {
      form.setFieldValue("dropDown.notificationMails", emailOption.emails);
    }
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
      console.log("❌ Validation failed:", validate.errors);
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
      subject: form.values.inputBox.subject,
      incident_link: form.values.inputBox.incidentLink,
      performer: form.values.inputBox.performer,
      departmentName: form.values.departmentName,
      status: form.values.radio.status,
      remaining_status:
        form.values.radio.status === "Not an Issue"
          ? JSON.stringify([])
          : JSON.stringify(form.values.radio.remainingStatus), // ✅ save,
      incident_type: form.values.radio.incidentType,
      revenue_impact: form.values.radio.revenueImpact,
      revenue_impact_details: form.values.inputBox.revenueImpactDetails,
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
      next_update_time: form.values.dateTime.nextUpdateTime.utc,
      resolved_time: form.values.dateTime.resolvedTime.utc,
      resolved_with_rca_time: form.values.dateTime.resolvedWithRcaTime.utc,
      resolved_details: stripHtml(form.values.textArea.resolvedDetails),
      resolved_with_rca_details: stripHtml(
        form.values.textArea.resolvedwithRcaDetails
      ),
      incident_details: stripHtml(form.values.textArea.incidentDetails),
    };
    // ✅ add only if user provided status update details
    if (form.values.textArea.statusUpdateDetails?.trim()) {
      preparedPayload.status_update_details = stripHtml(
        form.values.textArea.statusUpdateDetails
      );
    }

    // ✅ add only if user provided workaround details
    if (form.values.textArea.workaroundDetails?.trim()) {
      preparedPayload.workaround_details = stripHtml(
        form.values.textArea.workaroundDetails
      );
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
        disabledStatus: incident.status,
        inputBox: {
          ...form.values.inputBox,
          // inputNumber: incident.incident_number || "",
          inputNumber:
            form.values.inputBox.inputNumber || incident.incident_number || "",
          subject: incident.subject || "",
          incidentLink: incident.incident_link || "",
          performer: incident.performer || "",
          revenueImpactDetails: incident.revenue_impact_details || "",
        },
        radio: {
          ...form.values.radio,
          status: incident.status || "",
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

  const getSectionTitle = () => {
    if (incidentAction.actionType === "create") {
      if (computedStep === "knownIssue") return "Incident Classification";
      if (computedStep === "department") return "Select Department";
      if (computedStep === "form") return "Create Incident";
    }

    if (incidentAction.actionType === "update") {
      if (computedStep === "fetchIncident") return "Fetch Existing Incident";
      if (computedStep === "department") return "Update Department";
      if (computedStep === "form") return "Update Incident";
    }

    return null;
  };

  return (
    <>
      {!incidentAction.showForm && (
        <div className="w-full p-4 flex justify-center items-center mx-auto">
          <div className="w-2/5 flex-col flex justify-center items-center gap-4 cursor-pointer">
            <div
              className="w-full flex flex-col items-start justify-center
           bg-[#f7f8fb] rounded-3xl mt-4 
      shadow-[0_18px_40px_rgba(15,23,42,0.18)] p-10 gap-4"
              onClick={() =>
                setIncidentAction({
                  showForm: true,
                  actionType: "create",
                })
              }
            >
              <p className="font-extrabold text-4xl">Create Incident</p>
              <p className="text-[#777c8a] font-semibold">
                Log a new incident with severity, impact, timeline and ownership
              </p>
            </div>

            <div
              className="w-full flex flex-col items-start justify-center
           bg-[#f7f8fb] rounded-3xl mt-4 
      shadow-[0_18px_40px_rgba(15,23,42,0.18)] p-10 gap-4"
              onClick={() =>
                setIncidentAction({
                  showForm: true,
                  actionType: "update",
                })
              }
            >
              <p className="font-extrabold text-4xl">Update Ongoing Incident</p>
              <p className="text-[#777c8a] font-semibold">
                Send updates for an existing open incident
              </p>
            </div>
          </div>
          {/* 🔥 STATS GO HERE */}
          <div className="fixed bottom-0 left-0 w-full bg-transparent z-40">
            <div className="mx-auto max-w-6xl px-4 pb-4">
              <StatsOverview incidents={allIncidents} />
            </div>
          </div>
        </div>
      )}
      {incidentAction.showForm && (
        <div
          className="w-[90%] sm:w-[90%] md:w-[85%] 2xl:w-full
        max-w-[1400px] 2xl:max-w-[1800px] mx-auto bg-[#f7f8fb] rounded-3xl
        mt-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)] p-4 sm:p-6 md:p-8
        h-[calc(100vh-160px)] flex flex-col"
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 text-sm text-slate-500 mb-6 cursor-pointer hover:font-bold"
            onClick={prevStep}
          >
            <i className="fa-solid fa-chevron-left opacity-70" />
            <span>{formStep === 1 ? "Back to dashboard" : "Back"}</span>
          </div>

          {/* Main grid */}
          <div
            className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[180px_1fr]
            gap-6 md:gap-8 lg:gap-1 flex-1"
          >
            {/* LEFT — Stepper */}
            <aside
              className="pt-1 border-[#d4d7d9] border-r-2 h-full flex flex-col 
justify-between"
            >
              <div className="relative">
                {/* DOTTED LINE */}
                <div className="absolute left-[11px] top-0 bottom-0 border-l-2 border-dotted border-slate-300"></div>

                <ul className="space-y-6 relative z-10">
                  {/* STEP 1 */}
                  <li
                    className={`flex items-center gap-3 text-sm font-semibold ${formStep >= 1 ? "text-slate-900" : "text-slate-400"}`}
                  >
                    <div
                      className={`
          w-[22px] h-[22px] rounded-full flex items-center justify-center 
          border-2 transition-all duration-200
          ${formStep > 1 ? "bg-blue-600 border-blue-600 text-white" : ""}
          ${formStep === 1 ? "bg-blue-600 border-blue-600 text-white animate-pulse shadow-[0_0_10px_#60a5fa]" : ""}
          ${formStep < 1 ? "bg-white border-slate-300" : ""}
        `}
                    >
                      {formStep > 1 && (
                        <i className="fa-solid fa-check text-[12px]"></i>
                      )}
                    </div>

                    <span>
                      {incidentAction.actionType === "update"
                        ? "Fetch Incident"
                        : "Known Issue"}
                    </span>
                  </li>

                  {/* STEP 2 */}
                  <li
                    className={`flex items-center gap-3 text-sm ${formStep >= 2 ? "text-slate-900" : "text-slate-400"}`}
                  >
                    <div
                      className={`
          w-[22px] h-[22px] rounded-full flex items-center justify-center 
          border-2 transition-all duration-200
          ${formStep > 2 ? "bg-blue-600 border-blue-600 text-white" : ""}
          ${formStep === 2 ? "bg-blue-600 border-blue-600 text-white animate-pulse shadow-[0_0_10px_#60a5fa]" : ""}
          ${formStep < 2 ? "bg-white border-slate-300" : ""}
        `}
                    >
                      {formStep > 2 && (
                        <i className="fa-solid fa-check text-[12px]"></i>
                      )}
                    </div>

                    <span>Department</span>
                  </li>

                  {/* STEP 3 */}
                  <li
                    className={`flex items-center gap-3 text-sm ${formStep === 3 ? "text-slate-900" : "text-slate-400"}`}
                  >
                    <div
                      className={`
          w-[22px] h-[22px] rounded-full flex items-center justify-center 
          border-2 transition-all duration-200
          ${formStep === 3 ? "bg-blue-600 border-blue-600 text-white animate-pulse shadow-[0_0_10px_#60a5fa]" : "bg-white border-slate-300"}
        `}
                    ></div>

                    <span>Incident Form</span>
                  </li>
                </ul>
              </div>

              {oldIncidentData && (
                <div>
                  <IncidentData incidentData={oldIncidentData} />
                </div>
              )}
            </aside>

            {/* RIGHT — FORM */}
            <section className="w-full overflow-y-auto pr-2 pl-2 pb-10 max-h-[calc(100vh-250px)]">
              <Box
                mx="auto"
                p="xs"
                radius="md"
                shadow="lg"
                className="w-full flex flex-col items-center h-full"
              >
                {getSectionTitle() && (
                  <div className="w-full mb-4 text-2xl font-semibold text-slate-800 flex justify-center items-center">
                    {getSectionTitle()}
                  </div>
                )}{" "}
                <form className="w-full h-full overflow-y-auto p-2 flex flex-col items-start gap-4">
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
                    <div className="w-full h-full flex flex-col justify-center items-center gap-8">
                      {/* Conditional input for incident number */}
                      {incidentAction.actionType === "update" && (
                        <InputBtn
                          horizontalLayout={true}
                          title="Incident No.: "
                          width="auto"
                          placeholder="Enter Incident Number"
                          isBtn={true}
                          onClick={async (e) => {
                            e.preventDefault();

                            // Validate required fields first
                            const result = form.validateField(
                              "inputBox.inputNumber"
                            );

                            if (result.hasError) {
                              return;
                            }

                            // Fetch incident
                            const success = await searchIncident(e);

                            if (success) {
                              nextStep();
                            }
                          }}
                          inputProps={{
                            ...form.getInputProps("inputBox.inputNumber"), // keeps value, error, onBlur, etc.
                            onChange: (e) =>
                              handleChange(
                                "inputBox.inputNumber",
                                e.target.value
                              ), // replace default onChange
                          }}
                        />
                      )}
                    </div>
                  )}
                  {/* ======================= ✅ STEP 2 ======================= */}
                  {/* ✅ KNOWN ISSUE (RADIO + DISABLED WHEN FETCHED) */}
                  {computedStep === "knownIssue" && (
                    <div className="w-full h-full flex flex-col justify-center items-center gap-8">
                      <RadioBtn
                        data={["Yes", "No"]}
                        radioHead="Known Issue?"
                        horizontal={true}
                        inputProps={{
                          ...form.getInputProps("radio.known_issue"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("radio.known_issue", val), // replace default onChange
                        }}
                      />
                      {originalIncident && (
                        <p className="text-xs text-gray-400">
                          Known Issue is locked because this incident was
                          fetched.
                        </p>
                      )}

                      <ActionBtn
                        btnText="Continue"
                        type="button"
                        onClick={() => {
                          const result =
                            form.validateField("radio.known_issue");

                          // If either has an error → stop here
                          if (result.hasError) {
                            return;
                          }

                          // Move to next step
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

                      <div className="w-full max-w-[620px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 place-items-center">
                        {formTabs.map((dept) => (
                          <DepartmentCard
                            key={dept}
                            title={dept}
                            active={form.values.departmentName === dept}
                            onClick={() => {
                              handleChange("departmentName", dept);
                              form.setFieldValue(
                                "dropDown.affectedProduct",
                                null
                              );
                              form.setFieldValue(
                                "dropDown.notificationMails",
                                []
                              );
                              // setFormStep(4);
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
                    <div className="w-full h-full flex flex-col items-start overflow-y-auto gap-6">
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
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              width: "100%",
                              background: "#f7f8fb",
                              border: "1px solid #ddd",
                              borderRadius: "6px",
                              marginTop: "4px",
                              zIndex: 9999,
                              maxHeight: "200px",
                              overflowY: "auto",
                            }}
                          >
                            {suggestions.map((item) => (
                              <div
                                key={item.id}
                                style={{
                                  padding: "8px 10px",
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  form.setFieldValue(
                                    "inputBox.subject",
                                    item.subject
                                  );
                                  setSuggestions([]);
                                }}
                              >
                                {item.subject}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <IncidentTxtBox
                        inputProps={{
                          ...form.getInputProps("textArea.incidentDetails"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("textArea.incidentDetails", val), // replace default onChange
                        }}
                        startingLine="Incident Details:"
                      />

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

                          // If progressed beyond Suspected → Not an Issue must be locked
                          if (
                            current !== "Suspected" &&
                            status === "Not an Issue"
                          ) {
                            return true;
                          }

                          // Normal lifecycle locking
                          const currentIndex = STATUS_FLOW.indexOf(current);
                          const statusIndex = STATUS_FLOW.indexOf(status);

                          if (statusIndex === -1) return false;

                          return statusIndex < currentIndex;
                        }}
                      />
                      {form.values.radio.status === "Resolved" && (
                        <IncidentTxtBox
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
                      <div className="flex justify-center flex-col w-full items-start">
                        <div
                          className="w-auto flex gap-2 items-center"
                          onClick={() =>
                            form.setFieldValue(
                              "statusUpdate",
                              !form.values.statusUpdate
                            )
                          }
                        >
                          {form.values.statusUpdate ? (
                            <i className="fa-solid fa-circle-minus"></i>
                          ) : (
                            <i className="fa-solid fa-circle-plus"></i>
                          )}
                          <p>Add Status Update</p>
                        </div>
                        {form.values.statusUpdate && (
                          <IncidentTxtBox
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
                            startingLine="Status Update:"
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
                          inputProps={{
                            ...form.getInputProps("textArea.workaroundDetails"), // keeps value, error, onBlur, etc.
                            onChange: (val) =>
                              handleChange("textArea.workaroundDetails", val), // replace default onChange
                          }}
                          startingLine="Workaround Details:"
                        />
                      )}
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
                        options={form.values.dropDown.allEmailOptions}
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
                      {form.values.radio.status === "Resolved" && (
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
                        <Group w="100%">
                          <Title order={5} ta="left">
                            Impacted Revenue:{" "}
                          </Title>
                          <Textarea
                            placeholder="Enter a detailed description..."
                            radius="md"
                            size="md"
                            autosize
                            w="100%"
                            minRows={3}
                            styles={{
                              input: {
                                border: "1px solid #6badef",
                                background: "transparent",
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
                        </Group>
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
                        title="Level of Service Impact: "
                        data={[
                          "Tool Unavailability",
                          "Intermittent",
                          "Limited Functionality",
                        ]}
                        inputProps={{
                          ...form.getInputProps("dropDown.serviceImpacted"), // keeps value, error, onBlur, etc.
                          onChange: (val) =>
                            handleChange("dropDown.serviceImpacted", val), // replace default onChange
                        }}
                      />

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
              </Box>
            </section>
          </div>
        </div>
      )}
    </>
  );
};

export default Bar;
