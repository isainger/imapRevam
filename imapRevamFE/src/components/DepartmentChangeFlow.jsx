import { Modal } from "@mantine/core";
import ActionBtn from "./ActionBtn";
import IncidentTxtBox from "./IncidentTxtBox";

const DepartmentChangeFlow = ({
  opened,
  step, // "confirm" | "compose" | "submitting" | "success"
  progress = 0,

  fromDepartment,
  toDepartment,

  notifyStakeholders,
  setNotifyStakeholders,

  emailValue,
  onEmailChange,

  onCancel,
  onConfirmDirect,
  onNext,
  onSend,
}) => {
  if (!toDepartment && step === "confirm") return null;

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
      centered
      radius="lg"
      overlayProps={{ blur: 3 }}
      styles={
        step === "compose"
          ? { content: { "--modal-size": "min(90vw, 900px)" } }
          : undefined
      }
    >
      {/* ================= STEP 1 — CONFIRM ================= */}
      {step === "confirm" && (
        <div className="flex flex-col gap-6 text-center px-4 py-4">
          <div className="text-3xl text-orange-500">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>

          <h2 className="text-xl font-semibold">Confirm Department Change</h2>

          <p className="text-sm text-slate-600">
            You are about to change the department from{" "}
            <strong>{fromDepartment}</strong> to <strong>{toDepartment}</strong>
            .
          </p>
          <p className="text-sm text-red-500 font-bold mt-2">
            Note: Department can only be changed once per incident update.
          </p>

          <label className="flex items-center justify-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyStakeholders}
              onChange={(e) => setNotifyStakeholders(e.target.checked)}
            />
            Notify stakeholders about this change
          </label>

          <div className="flex justify-center gap-4 mt-4">
            <ActionBtn btnText="Cancel" onClick={onCancel} />

            {!notifyStakeholders && (
              <ActionBtn btnText="Confirm" onClick={onConfirmDirect} />
            )}

            {notifyStakeholders && (
              <ActionBtn btnText="Next" onClick={onNext} />
            )}
          </div>
        </div>
      )}

      {/* ================= STEP 2 — COMPOSE ================= */}
      {step === "compose" && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Notify Department Change</h2>
            <p className="text-sm text-slate-600 mt-1">
              Write a message explaining the department change.
            </p>
          </div>

          <IncidentTxtBox
            startingLine=""
            context="department_change"
            inputProps={{
              value: emailValue,
              onChange: onEmailChange,
            }}
          />

          <div className="flex justify-center gap-4 mt-4">
            <ActionBtn btnText="Cancel" onClick={onCancel} />
            <ActionBtn btnText="Send & Change Department" onClick={onSend} />
          </div>
        </div>
      )}

      {/* ================= STEP 3 — SUBMITTING ================= */}
      {step === "submitting" && (
        <div className="flex flex-col items-center gap-6 py-10">
          {/* Spinner */}
          <div className="text-blue-600 text-4xl">
            <i className="fa-solid fa-spinner fa-spin" />
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-slate-800">
            Notifying stakeholders…
          </h2>

          {/* Subtext */}
          <p className="text-sm text-slate-500 text-center max-w-sm">
            We are sending the department change notification and updating the
            incident.
          </p>

          {/* Progress */}
          <div className="w-full max-w-sm mt-4">
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="text-xs text-slate-500 text-center mt-2">
              {progress}%
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4 — SUCCESS ================= */}
      {step === "success" && (
        <div className="flex flex-col items-center gap-4 py-10">
          {/* Success badge */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
            <i className="fa-solid fa-check text-green-600 text-4xl" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-green-700">
            Department Changed Successfully
          </h2>

          {/* Description */}
          <p className="text-sm text-slate-600 text-center max-w-sm">
            The incident has been updated and all previous stakeholders have
            been notified.
          </p>

          {/* Redirect hint */}
          <p className="text-xs text-slate-400 mt-2">Redirecting you back…</p>
        </div>
      )}
    </Modal>
  );
};

export default DepartmentChangeFlow;
