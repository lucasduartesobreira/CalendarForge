const TitleSection = ({ name }: { name: string }) => {
  return <span className="m-2 text-neutral-600 bg-white text-lg ">{name}</span>;
};

export const Titles = {
  Normal: TitleSection,
};

