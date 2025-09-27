import React, { useEffect } from "react";
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
import {
  fetchIncidentByNumber,
  saveIncident,
} from "./services/incidentOperations";

const Bar = () => {
  const formTabs = ["General", "Publisher", "Advertiser", "Header Bidding"];
  const statusGradientMapNormal = {
    "Not an Issue": {
      gradient: "", // blue
      iconClass: "",
    },
    Suspected: {
      gradient: "#0056f0", // blue
      iconClass: "fa-solid fa-magnifying-glass",
    },
    Ongoing: {
      gradient: "#e53e3e", // red
      iconClass: "fa-solid fa-circle",
    },
    Resolved: {
      gradient: "#ecc94b", // yellow
      iconClass: "fa-solid fa-screwdriver-wrench",
    },
    "Resolved with Rca": {
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
  const initial_values = {
    departmentName: formTabs[0],
    known_issue: false,
    inputBox: {
      inputNumber: "",
      subject: "",
      incidentLink: "",
      performer: "",
      revenueImpactDetails: "",
    },
    radio: {
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
    },
    textArea: {
      incidentDetails: "",
      statusUpdateDetails: "",
      workaroundDetails: "",
    },
    statusUpdate: false,
    modalOpen: false,
  };

  const form = useForm({
    initialValues: initial_values,
    validate: {
      // InputBox validations
      inputBox: {
        inputNumber: (value, values) =>
          values.radio.inputIncident === "Yes" && value.trim().length === 0
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
        inputIncident: (value) => (!value ? "Please select incident" : null),
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
      },
    },
  });
  const statusGradientMap = form.values.known_issue
    ? statusGradientMapKnownIssue
    : statusGradientMapNormal;

  const handleChange = (field, value) => {
    if (field === "radio.status") {
      // if (.values.radio.remainingStatus.length === 0) {
      const statusKeys = Object.keys(statusGradientMap);
      const index = statusKeys.indexOf(value);
      if (index !== -1) {
        const remainingStatusValues = statusKeys
          .slice(index)
          .filter((item) => item !== "Not an Issue")
          .map((item) => ({
            statusName: item,
            color: statusGradientMap[item].gradient,
            icons: statusGradientMap[item].iconClass,
          }));
        form.setFieldValue("radio.remainingStatus", remainingStatusValues);
      }
      // }
    }
    form.setFieldValue(field, value);
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

  function extractIncidentNumber(url) {
    const match = url.match(/\/Case\/([a-zA-Z0-9]+)\//);
    return match ? match[1] : null;
  }

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

    if (form.values.radio.inputIncident === "No") {
      const existingIncident = await fetchIncidentByNumber(incidentNumber);
      if (existingIncident?.length > 0) {
        alert(
          "This incident number already exists! Please fetch it first to update."
        );
        return;
      }
    }

    const payload = {
      incident_number: incidentNumber,
      known_issue: form.values.known_issue,
      subject: form.values.inputBox.subject,
      incident_link: form.values.inputBox.incidentLink,
      performer: form.values.inputBox.performer,
      departmentName: form.values.departmentName,
      status: form.values.radio.status,
      remaining_status: JSON.stringify(form.values.radio.remainingStatus), // ✅ save
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
      next_update_time: form.values.dateTime.nextUpdateTime.utc,
      incident_details: stripHtml(form.values.textArea.incidentDetails),
    };
    // ✅ add only if user provided revenue impact details
    if (form.values.inputBox.revenueImpactDetails?.trim()) {
      payload.revenue_impact_details =
        form.values.inputBox.revenueImpactDetails;
    }

    // ✅ add only if user provided status update details
    if (form.values.textArea.statusUpdateDetails?.trim()) {
      payload.status_update_details = stripHtml(
        form.values.textArea.statusUpdateDetails
      );
    }

    // ✅ add only if user provided workaround details
    if (form.values.textArea.workaroundDetails?.trim()) {
      payload.workaround_details = stripHtml(
        form.values.textArea.workaroundDetails
      );
    }
    try {
      const response = await saveIncident(payload);
      console.log("✅ Incident saved:", response);
      form.reset();
    } catch (error) {
      console.log("✅ Incident saved:", response);
    }
  };

  const searchIncident = async (e) => {
    e.preventDefault();
    try {
      const incidentNumber = form.values.inputBox.inputNumber;
      console.log("Searching for incident:", incidentNumber);

      const response = await fetchIncidentByNumber(incidentNumber);
      console.log("Incident Data:", response);
      if (response && response.length > 0) {
        const incident = response[0];
        form.setValues({
          ...form.values,
          departmentName: incident.departmentName,
          known_issue: incident.known_issue,
          inputBox: {
            ...form.values.inputBox,
            inputNumber: incident.incident_number || "",
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
            nextUpdate: incident.next_update || "",
            workaround: incident.workaround || ""
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
              utc: incident.next_update_time || "",
            },
          },
          textArea: {
            ...form.values.textArea,
            incidentDetails: incident.incident_details || "",
            statusUpdateDetails: incident.status_update_details || "",
            workaroundDetails: incident.workaround_details || ""
          },
        });
      } else {
        console.log("⚠️ No incident found with this number");
      }
    } catch (error) {
      console.error("❌ Error searching incident:", error);
    }
  };

  return (
    <div className="mt-16 bg-white opacity-[1] w-4/5 rounded-2xl">
      <Box className="bg-[#32035e] rounded-t-xl rounded-b-md border-2 border-gray-200 text-center p-3 overflow-hidden box-border">
        <div className="flex flex-col gap-4 justify-center items-center">
          <div>
            <i className="fa-solid fa-users-gear text-white text-5xl"></i>
          </div>
          <Title order={2} c="white" ta="left">
            Incident Management Form
          </Title>
        </div>
      </Box>
      <Box className="w-full flex justify-center items-center p-4">
        <Switch
          label="Known Issue?"
          checked={form.values.known_issue}
          onChange={(event) => {
            handleChange("known_issue", event.currentTarget.checked);
            form.setFieldValue("radio.status", "");
            form.setFieldValue("radio.remainingStatus", []);
          }}
          size="md"
          color="purple"
          onLabel="Yes"
          offLabel="No"
        />
      </Box>
      <div className="flex w-full gap-4 justify-center items-center p-4 border-b-2 border-b-gray-100">
        {formTabs.map((item, index) => (
          <div
            key={index}
            className="flex flex-col flex-[1_0_auto] justify-center w-auto items-center cursor-pointer"
            onClick={() => {
              handleChange("departmentName", item);
              form.setFieldValue("dropDown.affectedProduct", null);
              form.setFieldValue("dropDown.notificationMails", []);
            }}
          >
            <div
              className={`w-full min-h-2 relative rounded-[3px] 
    ${form.values.departmentName === item ? "bg-[#7030a0]" : "bg-[#ba99a5]"}  
    ${
      form.values.departmentName === item
        ? 'after:border-t-[#7030a0] after:absolute after:w-0 after:h-0 after:border-l-[12px] after:border-l-transparent after:border-r-[12px] after:border-r-transparent after:border-t-[13px] after:content-[""] after:left-1/2 after:-translate-x-1/2'
        : ""
    }`}
            ></div>
            <div
              className={`${
                form.values.departmentName === item
                  ? "text-[#7030a0]"
                  : "text-[#ba99a5]"
              }`}
            >
              {item}
            </div>
          </div>
        ))}
      </div>
      <Box mx="auto" p="xs" radius="md" shadow="lg">
        <form className="w-full h-auto p-2 flex flex-col items-start justify-center gap-4 ">
          {/* Already Incident */}

          <RadioBtn
            data={["Yes", "No"]}
            radioHead="Already Incident"
            horizontal={true}
            inputProps={{
              ...form.getInputProps("radio.inputIncident"), // keeps value, error, onBlur, etc.
              onChange: (val) => handleChange("radio.inputIncident", val), // replace default onChange
            }}
          />

          {/* Conditional input for incident number */}
          {form.values.radio.inputIncident === "Yes" && (
            <InputBtn
              horizontalLayout={true}
              title="Incident No.: "
              width="auto"
              placeholder="Enter Incident Number"
              isBtn={true}
              onClick={searchIncident}
              inputProps={{
                ...form.getInputProps("inputBox.inputNumber"), // keeps value, error, onBlur, etc.
                onChange: (e) =>
                  handleChange("inputBox.inputNumber", e.target.value), // replace default onChange
              }}
            />
          )}
          {/* Subject input */}
          <InputBtn
            horizontalLayout={false}
            title="Subject: "
            width="100%"
            placeholder="Enter Subject"
            isBtn={false}
            inputProps={{
              ...form.getInputProps("inputBox.subject"), // keeps value, error, onBlur, etc.
              onChange: (e) => handleChange("inputBox.subject", e.target.value), // replace default onChange
            }}
          />

          <IncidentTxtBox
            inputProps={{
              ...form.getInputProps("textArea.incidentDetails"), // keeps value, error, onBlur, etc.
              onChange: (val) => handleChange("textArea.incidentDetails", val), // replace default onChange
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
          />
          <div className="flex justify-center flex-col w-full items-start">
            <div
              className="w-auto flex gap-2 items-center"
              onClick={() =>
                form.setFieldValue("statusUpdate", !form.values.statusUpdate)
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
                  ...form.getInputProps("textArea.statusUpdateDetails"), // keeps value, error, onBlur, etc.
                  onChange: (val) =>
                    handleChange("textArea.statusUpdateDetails", val), // replace default onChange
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
              onChange: (val) => handleChange("radio.workaround", val), // replace default onChange
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
            data={["Product/RnD", "PS/Support", "Customer", "Business"]}
            inputProps={{
              ...form.getInputProps("dropDown.reportedBy"), // keeps value, error, onBlur, etc.
              onChange: (val) => handleChange("dropDown.reportedBy", val), // replace default onChange
            }}
          />
          <DropdownBtn
            title="Severity: "
            data={["Emergency", "High", "Standard"]}
            inputProps={{
              ...form.getInputProps("dropDown.severity"), // keeps value, error, onBlur, etc.
              onChange: (val) => handleChange("dropDown.severity", val), // replace default onChange
            }}
          />
          <DropdownBtn
            title="Affected Product: "
            data={
              groupedProductOptions.find(
                (item) => item.group === form.values.departmentName
              )
                ? groupedProductOptions.find(
                    (item) => item.group === form.values.departmentName
                  ).items
                : groupedProductOptions
            }
            inputProps={{
              ...form.getInputProps("dropDown.affectedProduct"), // keeps value, error, onBlur, etc.
              onChange: (val) => handleChange("dropDown.affectedProduct", val), // replace default onChange
            }}
          />
          <MultiSelectEmails
            options={form.values.dropDown.allEmailOptions}
            value={form.values.dropDown.notificationMails}
            onChange={(val) => handleChange("dropDown.notificationMails", val)}
            title="Mail To : "
          />

          <RadioBtn
            data={["Downtime", "Service Interruption", "Maintainence"]}
            radioHead="Incident Type"
            inputProps={{
              ...form.getInputProps("radio.incidentType"), // keeps value, error, onBlur, etc.
              onChange: (val) => handleChange("radio.incidentType", val), // replace default onChange
            }}
          />

          <DateTimeSelector
            value={form.values.dateTime.startTime.local}
            onChange={(val) => handleDateTimeChange("startTime", val)}
            utcValue={form.values.dateTime.startTime.utc}
            label="Started Time (UTC) :"
            checkBox={false}
            inputProps={form.getInputProps("dateTime.startTime")}
          />

          <DateTimeSelector
            value={form.values.dateTime.discoveredTime.local}
            onChange={(val) => handleDateTimeChange("discoveredTime", val)}
            utcValue={form.values.dateTime.discoveredTime.utc}
            label="Support Discovered Time (UTC) :"
            checkBox={false}
            inputProps={form.getInputProps("dateTime.discoveredTime")}
          />

          <RadioBtn
            data={["Yes", "No"]}
            radioHead="Revenue Impact"
            inputProps={{
              ...form.getInputProps("radio.revenueImpact"), // keeps value, error, onBlur, etc.
              onChange: (val) => handleChange("radio.revenueImpact", val), // replace default onChange
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
                styles={{ input: { border: "2px solid #E5E7EB" } }}
                {...form.getInputProps("inputBox.revenueImpactDetails")}
                onChange={(e) =>
                  handleChange("inputBox.revenueImpactDetails", e.target.value)
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
              onChange: (val) => handleChange("dropDown.regionImpacted", val), // replace default onChange
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
              onChange: (val) => handleChange("dropDown.serviceImpacted", val), // replace default onChange
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
              onChange: (e) =>
                handleChange("inputBox.incidentLink", e.target.value), // replace default onChange
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
              onChange: (val) => handleChange("radio.nextUpdate", val), // replace default onChange
            }}
          />
          {form.values.radio.nextUpdate === "Yes" && (
            <DateTimeSelector
              value={form.values.dateTime.nextUpdateTime.local}
              onChange={(val) => handleDateTimeChange("nextUpdateTime", val)}
              utcValue={form.values.dateTime.nextUpdateTime.utc}
              label="Next Update Time (UTC) :"
              checkBox={true}
              inputProps={form.getInputProps("dateTime.nextUpdateTime")}
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
              mt=""
              boxWidth=""
              onClick={(e) => {
                e.preventDefault();
                form.setFieldValue("modalOpen", true);
              }}
              btnFont="animated_images"
              btnHeight="3rem"
            />
            <ActionBtn
              btnText="Submit"
              mt=""
              boxWidth=""
              btnFont="save"
              btnStyle=""
              btnHeight="3rem"
              onClick={handleSubmit}
            />
          </Box>
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
          <EmailTemplateLayout data={form.values} />
        </Modal>
      </Box>
    </div>
  );
};

export default Bar;
