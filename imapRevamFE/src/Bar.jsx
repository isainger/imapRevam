import React, { useEffect, useState } from "react";
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
import {
  TextInput,
  Box,
  Title,
  Stack,
  Radio,
  Group,
  Textarea,
  Modal,
  BackgroundImage,
} from "@mantine/core";
import SearchableInput from "./components/SearchableInput";

const Bar = () => {
  const formTabs = ["General", "Publisher", "Advertiser", "Header Bidding"];
  const statusGradientMap = {
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

  const form = useForm({
    initialValues: {
      tabSelected: formTabs[0],
      inputBox: {
        inputNumber: "",
        subject: "",
        incidentLink: "",
        performer: "",
      },
      radio: {
        inputIncident: "",
        status: "",
        remainingStatus: [],
        incidentType: "",
        revenueImpact: "",
      },
      dropDown: {
        reportedBy: "",
        severity: "",
        affectedProduct: "",
        regionImpacted: "",
        serviceImpacted: "",
        notificationMails: [],
        allEmailOptions: [],
      },
      dateTime: {
        startTime: { local: null, utc: null },
        discoveredTime: { local: null, utc: null },
        nextUpdateTime: { local: null, utc: null },
      },
      modalOpen: false,
    },

    validate: {
      // InputBox validations
      inputBox: {
        inputNumber: (value) =>
          value.trim().length === 0
            ? "Incident number is required"
            : !/^\d+$/.test(value)
            ? "Must be a number"
            : null,
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
      },

      // Radio validations
      radio: {
        inputIncident: (value) => (!value ? "Please select incident" : null),
        status: (value) => (!value ? "Please select status" : null),
        incidentType: (value) =>
          !value ? "Please select incident type" : null,
        revenueImpact: (value) =>
          !value ? "Please select revenue impact" : null,
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
        nextUpdateTime: (value) =>
          !value.local ? "Next update time is required" : null,
      },
    },
  });

  const handleChange = (field, value) => {
    if (field === "radio.status") {
      const statusKeys = Object.keys(statusGradientMap);
      const index = statusKeys.indexOf(value);
      if (index !== -1) {
        const remainingStatusValues = statusKeys.slice(index).map((item) => ({
          statusName: item,
          color: statusGradientMap[item].gradient,
          icons: statusGradientMap[item].iconClass,
        }));
        form.setFieldValue("radio.status", value);
        form.setFieldValue("radio.remainingStatus", remainingStatusValues);
        return;
      }
    }
    form.setFieldValue(field, value);
  };

  const handleDateTimeChange = (fieldKey, date) => {
    if (!date || isNaN(new Date(date).getTime())) return;

    const fullDate = new Date(date);

    form.setFieldValue(`dateTime.${fieldKey}`, {
      local: fullDate,
      utc: fullDate.toISOString(),
    });
  };

  useEffect(() => {
    const mergedEmails = Object.entries(emailGroups).map(([key, emails]) => ({
      group: key,
      emails: [...new Set(emails)], // dedupe per group
    }));
    form.setFieldValue("dropDown.allEmailOptions", mergedEmails);
  }, []);

  useEffect(() => {
    const selectedItem = form.values.dropDown.affectedProduct;

    let selectedGroup = "";

    // Find the group that includes the selected item
    for (let group of groupedProductOptions) {
      if (group.items.includes(selectedItem)) {
        selectedGroup = group.group;
        break;
      }
    }
    form.values.dropDown.allEmailOptions.map((item) => {
      if (selectedGroup === item.group) {
        form.setFieldValue("dropDown.notificationMails", item.emails);
        return;
      }
    });
  }, [form.values.dropDown.affectedProduct]);

  useEffect(() => {
    form.setFieldValue("dropDown.affectedProduct", null);
    form.setFieldValue("dropDown.notificationMails", []);
  }, [form.values.tabSelected]);

  const handleSubmit = (e) => {
    e.preventDefault();
    form.validate();
  };

  const searchIncident = () => {
    e.preventDefault();
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
      <div className="flex w-full gap-4 justify-center items-center p-4 border-b-2 border-b-gray-100">
        {formTabs.map((item, index) => (
          <div
            key={index}
            className="flex flex-col flex-[1_0_auto] justify-center w-auto items-center cursor-pointer"
            onClick={() => handleChange("tabSelected", item)}
          >
            <div
              className={`w-full min-h-2 relative rounded-[3px] 
    ${form.values.tabSelected === item ? "bg-[#7030a0]" : "bg-[#ba99a5]"}  
    ${
      form.values.tabSelected === item
        ? 'after:border-t-[#7030a0] after:absolute after:w-0 after:h-0 after:border-l-[12px] after:border-l-transparent after:border-r-[12px] after:border-r-transparent after:border-t-[13px] after:content-[""] after:left-1/2 after:-translate-x-1/2'
        : ""
    }`}
            ></div>
            <div
              className={`${
                form.values.tabSelected === item
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

          <IncidentTxtBox />

          {/* Status Radio Group */}
          <RadioBtn
            data={Object.keys(statusGradientMap)}
            radioHead="Status"
            inputProps={{
              ...form.getInputProps("radio.status"), // keeps value, error, onBlur, etc.
              onChange: (val) => handleChange("radio.status", val), // replace default onChange
            }}
          />
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
                (item) => item.group === form.values.tabSelected
              )
                ? groupedProductOptions.find(
                    (item) => item.group === form.values.tabSelected
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
          <DateTimeSelector
            value={form.values.dateTime.nextUpdateTime.local}
            onChange={(val) => handleDateTimeChange("nextUpdateTime", val)}
            utcValue={form.values.dateTime.nextUpdateTime.utc}
            label="Next Update Time (UTC) :"
            checkBox={true}
            inputProps={form.getInputProps("dateTime.nextUpdateTime")}
          />
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
