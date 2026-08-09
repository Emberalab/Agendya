import svgPaths from "./svg-lvlk7afqm3";

function LogoIcon() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Logo-Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="24" preserveAspectRatio="none" viewBox="0 0 24 24" width="24">
        <g id="Group">
          <path clipRule="evenodd" d={svgPaths.p2ff29c00} fill="#4F46E5" fillRule="evenodd" id="Vector" />
          <path clipRule="evenodd" d={svgPaths.p275d95f0} fill="#9E9BD8" fillRule="evenodd" id="Vector_2" />
          <path clipRule="evenodd" d={svgPaths.p22628f80} fill="#4F46E5" fillRule="evenodd" id="Vector_3" />
        </g>
      </svg>
    </div>
  );
}

export default function LogoGroup() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="Logo-Group">
      <LogoIcon />
    </div>
  );
}