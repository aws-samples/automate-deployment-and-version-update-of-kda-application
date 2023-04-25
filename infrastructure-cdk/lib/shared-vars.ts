import {ApplicationRuntime} from "./constructs/application-runtime";

export const APPLICATION_NAME = "kinesis-analytics-application"
export const BUILD_FOR_RUNTIME = ApplicationRuntime.JAVA
export const SOURCE_CODE_ZIP = "automate-deployment-and-version-update-of-kda-application-main.zip"
export const ASSET_BUCKET_EXPORT_NAME = "Blog::Artifact::BucketName"
export const MANUAL_APPROVAL_REQUIRED = true