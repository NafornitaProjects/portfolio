variable "app_name" {
  description = "Name of the application"
  type        = string
}

variable "namespace" {
  description = "Namespace to deploy resources into"
  type        = string
}

variable "domain" {
  description = "Domain to expose the app on"
  type        = string
}
