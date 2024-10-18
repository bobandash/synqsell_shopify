import { DropZone, Thumbnail } from "@shopify/polaris";
import { NoteIcon } from "@shopify/polaris-icons";
import { useCallback, type FC } from "react";

import styles from "./styles.module.css";

type UploadedImageProps = {
  url: string;
  altText: string;
};

type DropZoneImageFileProps = File | UploadedImageProps | null;

type Props = {
  file: DropZoneImageFileProps;
  setFile: React.Dispatch<React.SetStateAction<DropZoneImageFileProps>>;
  label?: string;
};

const ImageDropZone: FC<Props> = ({ file, setFile, label }) => {
  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) =>
      setFile(acceptedFiles[0]),
    [setFile],
  );

  const isUploadedImageProps = useCallback(
    (file: DropZoneImageFileProps): file is UploadedImageProps => {
      if (!file) {
        return false;
      }
      return (file as UploadedImageProps).url !== undefined;
    },
    [],
  );

  let imageUrl:
    | React.FunctionComponent<React.SVGProps<SVGSVGElement>>
    | string = "";
  let altText = "";
  if (file instanceof File) {
    imageUrl = window.URL.createObjectURL(file);
    altText = file.name;
  } else if (isUploadedImageProps(file)) {
    imageUrl = file.url;
    altText = file.altText;
  } else {
    imageUrl = NoteIcon;
    altText = "Undefined image";
  }

  return (
    <DropZone
      allowMultiple={false}
      onDrop={handleDropZoneDrop}
      type="image"
      accept="image/*"
      label={label ?? null}
      labelHidden={label === undefined}
    >
      {!file ? (
        <DropZone.FileUpload />
      ) : (
        <div className={styles["centered-dropzone"]}>
          <Thumbnail size="large" alt={altText} source={imageUrl} />
        </div>
      )}
    </DropZone>
  );
};

export type { DropZoneImageFileProps };
export { ImageDropZone };
