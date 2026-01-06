import { Modal } from "@mantine/core";
import ActionBtn from "./ActionBtn";

const ConfirmSubmitModal = ({
  opened,
  stage,
  // loading,
  submitProgress,
  purpose,
  onCancel,
  onConfirm,
}) => {
  const isExit = purpose === "exit";

  const title = isExit ? "Unsaved Changes" : "Confirm Submission";

  const description = isExit
    ? "You have unsaved changes. Are you sure you want to leave this page?"
    : "Please confirm that all details are correct before submitting.";

  // const confirmLabel = isExit
  //   ? "Yes, discard"
  //   : loading
  //     ? "Submitting..."
  //     : "Yes";

  return (
    // <Modal
    //   opened={opened}
    //   onClose={() => stage !== "success" && onCancel()}
    //   centered
    //   radius="lg"
    //   withCloseButton={false}
    //   overlayProps={{ blur: 3 }}
    // >
    <Modal
      opened={opened}
      onClose={() => {}} // do nothing
      closeOnClickOutside={false} // ❌ disable outside click
      closeOnEscape={false} // ❌ disable ESC
      withCloseButton={false}
      centered
      radius="lg"
      overlayProps={{ blur: 3 }}
    >
      {stage === "fetching" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600" />
          <h2 className="text-lg font-semibold">Fetching incident…</h2>
          <p className="text-sm text-slate-500">
            Please wait while we retrieve the incident.
          </p>
        </div>
      )}

      {stage === "fetch-error" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <i className="fa-solid fa-circle-exclamation text-3xl text-red-500" />
          <h2 className="text-lg font-semibold text-red-600">
            Unable to fetch incident
          </h2>
          <p className="text-sm text-slate-600 text-center">
            Something went wrong while fetching the incident.
          </p>

          <ActionBtn btnText="Try Again" onClick={onCancel} />
        </div>
      )}

      {stage === "fetch-not-found" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <i className="fa-solid fa-circle-xmark text-3xl text-orange-500" />
          <h2 className="text-lg font-semibold text-orange-600">
            Incident not found
          </h2>
          <p className="text-sm text-slate-600 text-center">
            No incident exists with this ID or link.
          </p>

          <ActionBtn btnText="Try Again" onClick={onCancel} />
        </div>
      )}

      {stage === "submitting" && (
        <div className="flex flex-col items-center gap-6 py-10">
          <div className="w-full max-w-sm">
            <div className="text-center text-sm font-medium text-slate-600 mb-3">
              Submitting…
            </div>

            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${submitProgress}%` }}
              />
            </div>

            <div className="text-xs text-slate-500 text-center mt-2">
              {submitProgress}%
            </div>
          </div>
        </div>
      )}

      {stage === "confirm" && (
        <div className="flex flex-col gap-6 text-center px-4 py-4">
          <div
            className={`text-3xl ${
              isExit ? "text-orange-500" : "text-blue-600"
            }`}
          >
            <i
              className={
                isExit
                  ? "fa-solid fa-triangle-exclamation"
                  : "fa-solid fa-circle-question"
              }
            />
          </div>

          <h2 className="text-xl font-semibold">{title}</h2>

          <p className="text-sm text-slate-600">{description}</p>

          <div className="flex justify-center gap-4 mt-4">
            <ActionBtn btnText="Cancel" type="button" onClick={onCancel} />

            <ActionBtn
              btnText={isExit ? "Yes, discard" : "Yes"}
              type="button"
              onClick={onConfirm}
            />
          </div>
        </div>
      )}

      {stage === "success" && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
            <i className="fa-solid fa-check text-green-600 text-4xl" />
          </div>

          <h2 className="text-xl font-semibold text-green-700">
            Submitted Successfully
          </h2>

          <p className="text-sm text-slate-600">Redirecting you back…</p>
        </div>
      )}
    </Modal>
  );
};

export default ConfirmSubmitModal;
