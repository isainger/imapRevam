import React, { useEffect, useRef, useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { useForm } from "@mantine/form";
import groupedProductOptions from "./data/GroupedProductItems";
import emailGroups from "./data/EmailGroups";
import performers from "./data/performerList";
import RadioBtn from "./components/RadioBtn";
import IncidentTxtBox from "./components/IncidentTxtBox";
import DropdownBtn from "./components/DropdownBtn";
import MultiSelectEmails from "./components/MultiSelectEmails";
import InputBtn from "./components/InputBtn";
import DateTimeSelector from "./components/DateTimeSelector";
import EmailTemplateLayout from "./utils/EmailTemplateLayout";
import { Box, Checkbox, Textarea, Modal, useComputedColorScheme } from "@mantine/core";
import SearchableInput from "./components/SearchableInput";
import { notifications } from "@mantine/notifications";
import {
  fetchIncidentByNumber,
  fetchAllIncidents,
  saveIncident,
  sendDepartmentChangeEmail,
} from "./services/incidentOperations";
import { endpoints } from "./services/api";
import DepartmentCard from "./components/DepartmentCard";
import IncidentData from "./components/IncidentData";
import ConfirmSubmitModal from "./components/ConfirmSubmitModal";
import DepartmentChangeFlow from "./components/DepartmentChangeFlow";
import ImapDashboardShell from "./components/ImapDashboardShell";
import "./styles/imapFormMock.css";

const Bar = () => {
  const colorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: false,
  });
  const previewDark = colorScheme === "dark";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCaseUrl, setCreatedCaseUrl] = useState(null);
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
  const pendingFlowSwitchRef = useRef(null);

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
      (current.inputBox.subject || "") !==
        (originalIncident.incident_subject || "") ||
      (current.inputBox.incidentLink || "") !==
        (originalIncident.incident_link || "") ||
      (current.inputBox.performer || "") !==
        (originalIncident.performer || "")
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

    // Revenue details only when "Yes" (ignore stale text hidden behind "No")
    const effRevenueDetails =
      current.radio.revenueImpact === "Yes"
        ? current.inputBox.revenueImpactDetails || ""
        : "";
    const origRevenueDetails =
      originalIncident.revenue_impact === "Yes"
        ? originalIncident.revenue_impact_details || ""
        : "";
    if (effRevenueDetails !== origRevenueDetails) return true;

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

    const curStatus = current.radio.status || "";
    const needsResolved =
      curStatus === "Resolved" || curStatus === "Resolved with RCA";
    const needsRca = curStatus === "Resolved with RCA";
    const nextYes = current.radio.nextUpdate === "Yes";

    const effNextUpdate = nextYes ? currentNextUpdate : null;
    const effResolvedTime = needsResolved ? currentResolved : null;
    const effResolvedRcaTime = needsRca ? currentResolvedRca : null;

    if (currentStart !== originalStart || currentDiscovered !== originalDiscovered)
      return true;
    if (effNextUpdate !== originalNextUpdate) return true;
    if (effResolvedTime !== originalResolved) return true;
    if (effResolvedRcaTime !== originalResolvedRca) return true;

    // text areas — compare rich text only when that section is active (same rules as save payload)
    const ta = current.textArea;
    const origTa = originalIncident;
    const effStatusUpdate =
      current.statusUpdate === true ? ta.statusUpdateDetails || "" : "";
    const origStatusUpdate = origTa.status_update_details || "";
    const effWorkaround =
      current.radio.workaround === "Yes" ? ta.workaroundDetails || "" : "";
    const origWorkaround =
      originalIncident.workaround === "Yes" ? origTa.workaround_details || "" : "";
    const effResolvedDetails = needsResolved ? ta.resolvedDetails || "" : "";
    const origResolvedDetails = needsResolved ? origTa.resolved_details || "" : "";
    const effRcaDetails = needsRca ? ta.resolvedwithRcaDetails || "" : "";
    const origRcaDetails = needsRca ? origTa.resolved_with_rca_details || "" : "";

    if (
      (ta.incidentDetails || "") !== (origTa.incident_details || "") ||
      effStatusUpdate !== origStatusUpdate ||
      effWorkaround !== origWorkaround ||
      effResolvedDetails !== origResolvedDetails ||
      effRcaDetails !== origRcaDetails
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
      createCase: false,
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
        incidentLink: (value, values) =>
          values.inputBox?.createCase
            ? null
            : !/^https:\/\/taboola\.lightning\.force\.com\/lightning\/r\/Case\/[A-Za-z0-9]+\/view$/.test(
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
      try {
        const data = await fetchAllIncidents();
        setAllIncidents(Array.isArray(data) ? data : []);
      } catch {
        setAllIncidents([]);
        notifications.show({
          title: "Could not load incidents",
          message:
            "The API returned an error or the database is unreachable. Check the backend terminal logs.",
          color: "red",
        });
      }
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
      setCreatedCaseUrl(null);
    }
  }, [form.values.radio.inputIncident]);

  const handleChange = (field, value) => {
    // 1. Always update UI immediately (fixes the inputBox overwrite lag)
    form.setFieldValue(field, value);

    if (field === "radio.workaround" && value !== "Yes") {
      form.setFieldValue("textArea.workaroundDetails", "");
    }
    if (field === "radio.nextUpdate" && value !== "Yes") {
      form.setFieldValue("dateTime.nextUpdateTime", {
        local: null,
        utc: null,
      });
    }
    if (field === "radio.revenueImpact" && value !== "Yes") {
      form.setFieldValue("inputBox.revenueImpactDetails", "");
    }

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
    setCreatedCaseUrl(null);

    setFormStep(1);
    setDepartmentLocked(false); // ✅ RESET HERE

    setIncidentAction({
      showForm: false,
      actionType: null,
    });
  };
  const openConfirm = (purpose) => {
    setConfirmPurpose(purpose); // "exit" | "submit" | "switchFlow"
    setConfirmStage("confirm");
    setConfirmOpen(true);
  };

  function shouldConfirmDiscardBeforeFlowSwitch() {
    if (!incidentAction.showForm) return false;
    if (incidentAction.actionType === "create") {
      return isCreateFormDirty() || formStep > 1;
    }
    if (incidentAction.actionType === "update") {
      if (originalIncident != null) return true;
      if (Array.isArray(oldIncidentData) && oldIncidentData.length > 0)
        return true;
      if (formStep > 1) return true;
      if (String(form.values.inputBox.inputNumber || "").trim()) return true;
      return false;
    }
    return false;
  }

  function beginFlowSwitch(run) {
    if (!shouldConfirmDiscardBeforeFlowSwitch()) {
      run();
      return;
    }
    pendingFlowSwitchRef.current = run;
    openConfirm("switchFlow");
  }
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
    // Auto-create Salesforce case when the checkbox is ticked (new incidents only)
    let incidentLinkValue = form.values.inputBox.incidentLink;
    if (
      form.values.inputBox.createCase &&
      incidentAction.actionType === "create" &&
      !originalIncident
    ) {
      setIsSubmitting(true);
      try {
        const extractEmail = (performer) => {
          const m = performer?.match(/\(([^)]+)\)$/);
          return m ? m[1] : performer || "";
        };
        const stripHtml = (str) =>
          str ? str.replace(/<[^>]*>/g, "").trim() : "";

        const revenueDetails =
          form.values.radio.revenueImpact === "Yes" &&
          form.values.inputBox.revenueImpactDetails
            ? `\n\nRevenue Impact: ${form.values.inputBox.revenueImpactDetails}`
            : "";

        const reportedByMap = {
          "Product/RnD": "R&D",
          "PS/Support": "PS",
          "Customer": "Customer",
          "Business": "Business",
        };

        const casePayload = {
          record_type: "0123o00000224NjAAI",
          business_area: "Publisher",
          subject: form.values.inputBox.subject,
          description:
            stripHtml(form.values.textArea.incidentDetails) + revenueDetails,
          severity: form.values.dropDown.severity || "Standard",
          revenue_impact: "",
          backstage_account_id: "1816487",
          case_origin: "Taboola Web",
          customer_email: extractEmail(form.values.inputBox.performer),
          incident_type: "Incident Notification",
          reported_by: reportedByMap[form.values.dropDown.reportedBy] || undefined,
          affected_product: form.values.dropDown.affectedProduct || "",
          started_time:
            form.values.dateTime.startTime.utc || new Date().toISOString(),
          support_discovered_time:
            form.values.dateTime.discoveredTime.utc || new Date().toISOString(),
          resolved_time: form.values.dateTime.resolvedTime?.utc || "",
        };

        const caseRes = await fetch(endpoints.SALESFORCE_CREATE_CASE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(casePayload),
        });

        if (!caseRes.ok)
          throw new Error(`Case creation failed (${caseRes.status})`);

        const caseData = await caseRes.json();
        if (!caseData.sf_case_url)
          throw new Error("No case URL returned from Salesforce");

        incidentLinkValue = caseData.sf_case_url;
        form.setFieldValue("inputBox.incidentLink", incidentLinkValue);
        setCreatedCaseUrl(caseData.sf_case_url);
      } catch (err) {
        setIsSubmitting(false);
        notifications.show({
          title: "Case Creation Failed",
          message: `Could not create Salesforce case: ${err.message}`,
          color: "red",
        });
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    const incidentNumber = extractIncidentNumber(incidentLinkValue);

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
      incident_link: incidentLinkValue,
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

    if (confirmPurpose === "switchFlow") {
      setConfirmOpen(false);
      setConfirmStage("confirm");
      const run = pendingFlowSwitchRef.current;
      pendingFlowSwitchRef.current = null;
      resetToMainScreen();
      run?.();
      return;
    }

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
          iconColor: "var(--imap-brand)",
          label: "Step 2 of 3",
          title: "Select Department",
          subtitle:
            "Choose the team responsible for owning this incident. Pick the team that should own the next steps.",
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
          icon: "fa-solid fa-building",
          iconColor: "var(--imap-brand)",
          label: "Step 2 of 3",
          title: "Update Department",
          subtitle:
            "Reassign this incident to a different department if needed. Pick the team that should own the next steps.",
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

  const openCreateFlow = () => {
    beginFlowSwitch(() => {
      setOldIncidentData(null);
      setOriginalIncident(null);
      setFormStep(1);
      setDepartmentLocked(false);
      form.setFieldValue("inputBox.inputNumber", "");
      setIncidentAction({ showForm: true, actionType: "create" });
    });
  };

  const openUpdateFlow = () => {
    beginFlowSwitch(() => {
      setOldIncidentData(null);
      setOriginalIncident(null);
      setFormStep(1);
      setDepartmentLocked(false);
      form.setFieldValue("inputBox.inputNumber", "");
      setIncidentAction({ showForm: true, actionType: "update" });
    });
  };

  const openUpdateFlowWithIncident = (incidentNumber) => {
    const v =
      incidentNumber != null ? String(incidentNumber).trim() : "";
    beginFlowSwitch(() => {
      setOldIncidentData(null);
      setOriginalIncident(null);
      setFormStep(1);
      setDepartmentLocked(false);
      form.setFieldValue("inputBox.inputNumber", v);
      setIncidentAction({ showForm: true, actionType: "update" });
    });
  };

  return (
    <ImapDashboardShell
      incidents={allIncidents}
      onCreate={openCreateFlow}
      onUpdate={openUpdateFlow}
      onEditIncident={({ incidentNumber }) =>
        openUpdateFlowWithIncident(incidentNumber)
      }
      formOpen={!!incidentAction.showForm}
      sidebarWorkflow={
        incidentAction.showForm ? (
          <>
            <div className="imap-sidebar-workflow-top">
              <button type="button" className="fstep-back" onClick={prevStep}>
                <div className="fstep-back-icon" aria-hidden>
                  <i className="fa-solid fa-arrow-left" />
                </div>
                <div className="fstep-back-labels">
                  <div className="fstep-back-top">
                    {formStep === 1 ? "Navigate" : `Step ${formStep} of 3`}
                  </div>
                  <div className="fstep-back-main">
                    {formStep === 1 ? "Back to Dashboard" : "Previous Step"}
                  </div>
                </div>
              </button>
              <div className="fstep-progress-label">Progress</div>
              <div className="fstep-list">
                {[
                  incidentAction.actionType === "update"
                    ? "Fetch Incident"
                    : "Known Issue",
                  "Department",
                  "Incident Form",
                ].map((label, idx) => {
                  const n = idx + 1;
                  const done = formStep > n;
                  const active = formStep === n;
                  return (
                    <div key={label} className="fstep-item">
                      <div className="fstep-track">
                        <div
                          className={`fstep-dot ${done ? "done" : active ? "active" : "pending"}`}
                        >
                          {done ? (
                            <Check
                              className="h-3.5 w-3.5 text-[#002818]"
                              strokeWidth={3}
                            />
                          ) : (
                            n
                          )}
                        </div>
                        {idx < 2 ? (
                          <div
                            className={`fstep-line ${formStep > n ? "done" : ""}`}
                          />
                        ) : null}
                      </div>
                      <div className="fstep-name-wrap">
                        <div
                          className={`fstep-name ${done ? "done" : active ? "active" : "pending"}`}
                        >
                          {label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="imap-sidebar-workflow-bottom">
              {oldIncidentData ? (
                <>
                  <IncidentData incidentData={oldIncidentData} />
                  <div className="fstep-inc-card">
                    <div className="fstep-inc-header">
                      <i className="fa-solid fa-circle-info" />
                      <span>Current incident</span>
                    </div>
                    <div className="fstep-inc-row">
                      <span className="fstep-inc-key">Display ID</span>
                      <span className="fstep-inc-val">
                        {oldIncidentData[0]?.display_id != null &&
                        oldIncidentData[0]?.display_id !== ""
                          ? `INC-${String(oldIncidentData[0].display_id).padStart(4, "0")}`
                          : "—"}
                      </span>
                    </div>
                    <div className="fstep-inc-row">
                      <span className="fstep-inc-key">Salesforce #</span>
                      <span className="fstep-inc-val fstep-inc-mono">
                        {oldIncidentData[0]?.incident_number || "—"}
                      </span>
                    </div>
                    <div className="fstep-inc-row">
                      <span className="fstep-inc-key">Severity</span>
                      <span
                        className="fstep-inc-sev rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor:
                            (oldIncidentData[0]?.severity ||
                              form.values.dropDown.severity) === "Emergency"
                              ? "var(--imap-accent-rose-bg)"
                              : (oldIncidentData[0]?.severity ||
                                    form.values.dropDown.severity) === "High"
                                ? "var(--imap-accent-amber-bg)"
                                : "rgba(59,130,246,0.15)",
                          color:
                            (oldIncidentData[0]?.severity ||
                              form.values.dropDown.severity) === "Emergency"
                              ? "var(--imap-accent-rose-fg)"
                              : (oldIncidentData[0]?.severity ||
                                    form.values.dropDown.severity) === "High"
                                ? "var(--imap-accent-amber-fg)"
                                : "var(--imap-brand)",
                        }}
                      >
                        {oldIncidentData[0]?.severity ||
                          form.values.dropDown.severity ||
                          "—"}
                      </span>
                    </div>
                    <div className="fstep-inc-row">
                      <span className="fstep-inc-key">Status</span>
                      <span className="fstep-inc-small font-semibold" style={{ color: "var(--imap-form-secondary)" }}>
                        {oldIncidentData[0]?.incident_status || "—"}
                      </span>
                    </div>
                    <div className="fstep-inc-row">
                      <span className="fstep-inc-key">Department</span>
                      <span className="fstep-inc-small font-semibold" style={{ color: "var(--imap-form-secondary)" }}>
                        {oldIncidentData[0]?.departmentName ||
                          form.values.departmentName ||
                          "—"}
                      </span>
                    </div>
                    <div className="fstep-inc-row">
                      <span className="fstep-inc-key">Created</span>
                      <span className="fstep-inc-val text-sm font-semibold" style={{ color: "var(--imap-text-secondary)" }}>
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
                </>
              ) : null}
            </div>
          </>
        ) : null
      }
      formOverlay={
        incidentAction.showForm ? (
          <>
            {computedStep !== "department"
              ? (() => {
                  const meta = getSectionMeta();
                  if (!meta) return null;
                  return (
                    <div className="fhdr">
                      <div className="fhdr-top">
                        <div
                          className="fhdr-icon"
                          style={{
                            background: `${meta.iconColor}22`,
                            color: meta.iconColor,
                          }}
                        >
                          <i className={meta.icon} />
                        </div>
                        <span
                          className="fhdr-pill"
                          style={{
                            background: `${meta.iconColor}22`,
                            color: meta.iconColor,
                            border: `1px solid ${meta.iconColor}44`,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <h1 className="fhdr-h1">{meta.title}</h1>
                      <p className="fhdr-sub">{meta.subtitle}</p>
                      <div
                        className="fhdr-line"
                        style={{
                          background: `linear-gradient(to right, ${meta.iconColor}55, transparent)`,
                        }}
                      />
                    </div>
                  );
                })()
              : null}
            <Box
              mx={0}
              p={0}
              className="flex min-h-0 w-full flex-1 flex-col bg-transparent"
              style={{ boxShadow: "none" }}
            >
              <form className="flex min-h-0 w-full flex-1 flex-col items-start gap-3 overflow-y-auto">
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
                    <div className="fstep-center form-mock-dark-radio w-full px-2">
                      <div className="fstep-card">
                        <div
                          className="fstep-card-icon"
                          style={{
                            background: "rgba(124, 58, 237, 0.14)",
                            color: "#a78bfa",
                          }}
                        >
                          <i className="fa-solid fa-magnifying-glass" />
                        </div>
                        <div>
                          <h2 className="fstep-card-title">
                            Find your incident
                          </h2>
                          <p className="fstep-card-desc">
                            Enter the incident number as listed in Case ID or
                            Task ID
                          </p>
                        </div>
                        {incidentAction.actionType === "update" && (
                          <div className="w-full">
                            <div className="f-field">
                              <label className="f-label">
                                Incident number{" "}
                                <span className="f-req">*</span>
                              </label>
                              <div className="f-fetch-row">
                                <input
                                  className="f-input"
                                  placeholder="e.g. 2024013001-ABC or Case ID"
                                  value={
                                    form.values.inputBox.inputNumber ?? ""
                                  }
                                  onChange={(e) =>
                                    handleChange(
                                      "inputBox.inputNumber",
                                      e.target.value
                                    )
                                  }
                                  onBlur={
                                    form.getInputProps("inputBox.inputNumber")
                                      .onBlur
                                  }
                                />
                                <button
                                  type="button"
                                  className="f-fetch-btn"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    const result = form.validateField(
                                      "inputBox.inputNumber"
                                    );
                                    if (result.hasError) return;
                                    const success = await searchIncident(e);
                                    if (success) nextStep();
                                  }}
                                >
                                  <i className="fa-solid fa-magnifying-glass" />{" "}
                                  Fetch
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        <div
                          className="fstep-callout"
                          style={{
                            background: "rgba(124, 58, 237, 0.1)",
                            border: "1px solid rgba(124, 58, 237, 0.22)",
                          }}
                        >
                          <i className="fa-solid fa-circle-info mt-0.5 text-sm text-[#a78bfa]" />
                          <p>
                            <strong>Where to find it:</strong> Copy the incident
                            number from the dashboard or use the Case URL
                            directly.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* ======================= ✅ STEP 2 ======================= */}
                  {/* ✅ KNOWN ISSUE (RADIO + DISABLED WHEN FETCHED) */}
                  {computedStep === "knownIssue" && (
                    <div className="fstep-center form-mock-dark-radio w-full flex-col gap-6 px-2">
                      <div className="fstep-card">
                        <div
                          className="fstep-card-icon"
                          style={{
                            background: "rgba(0, 102, 255, 0.14)",
                            color: "#0066ff",
                          }}
                        >
                          <i className="fa-solid fa-circle-question" />
                        </div>
                        <div>
                          <h2 className="fstep-card-title">
                            Is this a known issue?
                          </h2>
                          <p className="fstep-card-desc">
                            Tell us whether this is a known recurring issue
                            before we continue.
                          </p>
                        </div>
                        <div className="w-full">
                          <RadioBtn
                            data={["Yes", "No"]}
                            radioHead="Known issue?"
                            horizontal={true}
                            inputProps={{
                              ...form.getInputProps("radio.known_issue"),
                              onChange: (val) =>
                                handleChange("radio.known_issue", val),
                            }}
                          />
                        </div>
                        {originalIncident && (
                          <p className="text-center text-xs italic text-slate-500">
                            Locked — this incident was loaded from the database.
                          </p>
                        )}
                        <div
                          className="fstep-callout"
                          style={{
                            background: "rgba(0, 102, 255, 0.1)",
                            border: "1px solid rgba(0, 102, 255, 0.22)",
                          }}
                        >
                          <i className="fa-solid fa-lightbulb mt-0.5 text-sm text-[#0066ff]" />
                          <p>
                            <strong>Tip:</strong> Select &apos;Yes&apos; for
                            existing or previously identified issues. Select
                            &apos;No&apos; for new or unidentified incidents.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="f-continue"
                        onClick={() => {
                          const result =
                            form.validateField("radio.known_issue");
                          if (result.hasError) return;
                          nextStep();
                        }}
                      >
                        Continue{" "}
                        <i
                          className="fa-solid fa-arrow-right"
                          style={{ fontSize: 10 }}
                        />
                      </button>
                    </div>
                  )}
                  {/* ======================= ✅ STEP 3 — DEPARTMENT (dark stage — mock parity) ======================= */}
                  {computedStep === "department" && (
                    <div className="fstep-center fstep-center--dept form-mock-dark-radio w-full flex-col gap-6 px-2">
                      <div className="fstep-card fstep-card--dept">
                        {(() => {
                          const meta = getSectionMeta();
                          if (!meta) return null;
                          return (
                            <div className="fhdr w-full" style={{ marginBottom: 18 }}>
                              <div className="fhdr-top">
                                <div
                                  className="fhdr-icon"
                                  style={{
                                    background: "var(--imap-brand-dim)",
                                    color: "var(--imap-brand)",
                                  }}
                                >
                                  <i className="fa-solid fa-building" />
                                </div>
                                <span
                                  className="fhdr-pill"
                                  style={{
                                    background: "var(--imap-brand-dim)",
                                    color: "var(--imap-brand)",
                                  }}
                                >
                                  {meta.label}
                                </span>
                              </div>
                              <h1 className="fhdr-h1">{meta.title}</h1>
                              <p className="fhdr-sub">{meta.subtitle}</p>
                              <div
                                className="fhdr-line"
                                style={{
                                  background:
                                    "linear-gradient(90deg, rgba(45,212,191,0.35), rgba(0,102,255,0.2), transparent)",
                                  marginTop: 14,
                                }}
                              />
                            </div>
                          );
                        })()}
                        <div className="dept-grid-light w-full">
                          {formTabs.map((dept) => (
                            <DepartmentCard
                              key={dept}
                              title={dept}
                              active={form.values.departmentName === dept}
                              disabled={departmentLocked}
                              onClick={() => {
                                if (departmentLocked) return;
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
                                if (form.values.departmentName === dept) return;
                                setPendingDepartment(dept);
                                setDeptFlowStep("confirm");
                                setDeptConfirmOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="f-continue-light"
                        onClick={() => {
                          if (!form.values.departmentName) {
                            alert("Please select a department");
                            return;
                          }
                          nextStep();
                        }}
                      >
                        Continue{" "}
                        <i
                          className="fa-solid fa-arrow-right"
                          style={{ fontSize: 11, marginLeft: 6 }}
                        />
                      </button>
                    </div>
                  )}
                  {/* ======================= ✅ STEP 4 ======================= */}
                  {/* ✅ FULL FORM (UNCHANGED FIELDS) */}
                  {computedStep === "form" && (
                    <div className="form-mock-dark-fields imap-form-field-wrap flex w-full flex-col items-start gap-4 overflow-y-auto">
                      <div className="f-section mt-2">
                        <div
                          className="f-section-icon"
                          style={{
                            background: "rgba(0, 102, 255, 0.14)",
                            color: "#0066ff",
                          }}
                        >
                          <i className="fa-solid fa-info text-[10px]" />
                        </div>
                        <span className="f-section-label">
                          Basic Information
                        </span>
                        <div className="f-section-line" />
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
                          <div className="imap-subject-suggestions">
                            {suggestions.map((item) => (
                              <div
                                key={item.id}
                                className="imap-subject-suggestions-item"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    form.setFieldValue(
                                      "inputBox.subject",
                                      item.incident_subject
                                    );
                                    setSuggestions([]);
                                  }
                                }}
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
                      <div className="f-section mt-4">
                        <div
                          className="f-section-icon"
                          style={{
                            background: "rgba(229, 62, 62, 0.14)",
                            color: "#f87171",
                          }}
                        >
                          <i className="fa-solid fa-signal text-[10px]" />
                        </div>
                        <span className="f-section-label">
                          Status & Resolution
                        </span>
                        <div className="f-section-line" />
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
                          onClick={() => {
                            const next = !form.values.statusUpdate;
                            form.setFieldValue("statusUpdate", next);
                            if (!next) {
                              form.setFieldValue(
                                "textArea.statusUpdateDetails",
                                ""
                              );
                            }
                          }}
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
                      <div className="f-section mt-4">
                        <div
                          className="f-section-icon"
                          style={{
                            background: "rgba(124, 58, 237, 0.14)",
                            color: "#a78bfa",
                          }}
                        >
                          <i className="fa-solid fa-tags text-[10px]" />
                        </div>
                        <span className="f-section-label">
                          Classification
                        </span>
                        <div className="f-section-line" />
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
                      <div className="f-section mt-4">
                        <div
                          className="f-section-icon"
                          style={{
                            background: "rgba(8, 145, 178, 0.14)",
                            color: "#22d3ee",
                          }}
                        >
                          <i className="fa-regular fa-clock text-[10px]" />
                        </div>
                        <span className="f-section-label">Timeline</span>
                        <div className="f-section-line" />
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
                      <div className="f-section mt-4">
                        <div
                          className="f-section-icon"
                          style={{
                            background: "rgba(217, 119, 6, 0.14)",
                            color: "#fbbf24",
                          }}
                        >
                          <i className="fa-solid fa-chart-line text-[10px]" />
                        </div>
                        <span className="f-section-label">
                          Impact & Details
                        </span>
                        <div className="f-section-line" />
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
                      <div className="f-section mt-4">
                        <div
                          className="f-section-icon"
                          style={{
                            background: "rgba(5, 150, 105, 0.14)",
                            color: "#34d399",
                          }}
                        >
                          <i className="fa-solid fa-link text-[10px]" />
                        </div>
                        <span className="f-section-label">
                          Ownership & Links
                        </span>
                        <div className="f-section-line" />
                      </div>
                      {incidentAction.actionType === "create" && !originalIncident && (
                        <Checkbox
                          label="Auto-create Salesforce Case"
                          checked={form.values.inputBox.createCase}
                          onChange={(e) =>
                            form.setFieldValue(
                              "inputBox.createCase",
                              e.currentTarget.checked
                            )
                          }
                          mb={4}
                        />
                      )}
                      {!form.values.inputBox.createCase && (
                        <InputBtn
                          horizontalLayout={false}
                          title="Incident Link: "
                          width="100%"
                          placeholder="Enter Incident Link"
                          isBtn={false}
                          inputProps={{
                            ...form.getInputProps("inputBox.incidentLink"),
                            disabled: !!originalIncident,
                            readOnly: !!originalIncident,
                            onChange: (e) =>
                              handleChange(
                                "inputBox.incidentLink",
                                e.target.value
                              ),
                          }}
                        />
                      )}
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
                      <div className="f-actions">
                        <button
                          type="button"
                          className="f-btn-preview"
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
                        >
                          <i className="fa-solid fa-envelope-open-text" />
                          Preview Email
                        </button>
                        {isSubmitting && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "10px 14px", marginBottom: "8px",
                            borderRadius: "8px",
                            background: "var(--imap-form-brand-dim)",
                            border: "1px solid var(--imap-form-brand)",
                          }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--imap-form-brand)", fontSize: "13px" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--imap-form-brand)", marginBottom: "5px" }}>
                                Creating Salesforce Case...
                              </div>
                              <div style={{ height: "4px", borderRadius: "2px", background: "var(--imap-form-brand-dim)", overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", borderRadius: "2px", background: "var(--imap-form-brand)",
                                  animation: "sf-progress-slide 1.2s ease-in-out infinite",
                                }} />
                              </div>
                            </div>
                          </div>
                        )}
                        {createdCaseUrl && !isSubmitting && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "10px 14px", marginBottom: "8px",
                            borderRadius: "8px",
                            background: "rgba(5,150,105,0.1)",
                            border: "1px solid rgba(5,150,105,0.4)",
                          }}>
                            <i className="fa-solid fa-circle-check" style={{ color: "#10b981", fontSize: "14px", flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "#10b981", marginBottom: "3px" }}>
                                Salesforce Case Created
                              </div>
                              <a
                                href={createdCaseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: "11px", color: "var(--imap-form-brand)", wordBreak: "break-all", textDecoration: "none" }}
                              >
                                {createdCaseUrl.match(/\/Case\/([^/]+)\//)?.[1] ?? createdCaseUrl}
                              </a>
                            </div>
                            <button
                              type="button"
                              title="Copy link"
                              onClick={() => navigator.clipboard.writeText(createdCaseUrl)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--imap-form-brand)", padding: "4px", flexShrink: 0 }}
                            >
                              <i className="fa-regular fa-copy" style={{ fontSize: "13px" }} />
                            </button>
                            <button
                              type="button"
                              title="Dismiss"
                              onClick={() => setCreatedCaseUrl(null)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--imap-form-muted)", padding: "4px", flexShrink: 0 }}
                            >
                              <i className="fa-solid fa-xmark" style={{ fontSize: "13px" }} />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          className="f-btn-submit"
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          style={isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                        >
                          <i className={isSubmitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-paper-plane"} />
                          {isSubmitting ? "Creating Case..." : "Submit"}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
                <Modal
                  opened={form.values.modalOpen}
                  onClose={() => form.setFieldValue("modalOpen", false)}
                  title="Email preview"
                  centered
                  styles={{
                    root: {
                      "--modal-size": "min(96vw, 920px)",
                    },
                    header: {
                      background: "var(--imap-modal-surface)",
                      borderBottom: "1px solid var(--imap-glass-line)",
                      padding: "12px 16px",
                      margin: 0,
                    },
                    title: {
                      color: "var(--imap-form-text)",
                      fontWeight: 700,
                      fontSize: "15px",
                    },
                    close: {
                      color: "var(--imap-form-muted)",
                      cursor: "pointer",
                    },
                    content: {
                      width: "min(96vw, 920px)",
                      maxWidth: "min(96vw, 920px)",
                      minWidth: "min(100%, 680px)",
                      background: "var(--imap-modal-surface)",
                      border: "1px solid var(--imap-glass-line)",
                    },
                    body: {
                      maxHeight: "min(85vh, 900px)",
                      overflowY: "auto",
                      padding: "1rem 1.5rem",
                    },
                  }}
                >
                  <EmailTemplateLayout
                    previewDark={previewDark}
                    data={{
                      ...form.values,
                      history: oldIncidentData || [],
                    }}
                  />
                </Modal>
                <ConfirmSubmitModal
                  opened={confirmOpen}
                  stage={confirmStage}
                  loading={saving}
                  submitProgress={submitProgress}
                  purpose={confirmPurpose}
                  onCancel={() => {
                    if (confirmPurpose === "switchFlow") {
                      pendingFlowSwitchRef.current = null;
                    }
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
          </>
        ) : null
      }
    />
  );

};

export default Bar;
