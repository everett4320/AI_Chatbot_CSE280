const rossMarkUrl = `${import.meta.env.BASE_URL}figma/ross-mark.svg`;

export function RossAvatar() {
  return (
    <span className="ross-message__avatar" aria-hidden="true">
      <img src={rossMarkUrl} alt="" />
    </span>
  );
}
