# Terraform skeleton for the GCP footprint.
#
# This is an intentionally small, readable module showing the shape of the
# infrastructure the role owns: a regional GKE cluster, a private Cloud SQL
# Postgres instance, Memorystore Redis and a GCS bucket for audit exports.
#
# NOTE: Not applied in this environment (no GCP credentials / Terraform binary);
# it is a design artifact. See ../TRUST.md.

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
  backend "gcs" {
    bucket = "carecare-tfstate"
    prefix = "env/prod"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "GCP project id."
}

variable "region" {
  type    = string
  default = "europe-west3"
}

variable "env" {
  type    = string
  default = "prod"
}

locals {
  name = "carecare-${var.env}"
  labels = {
    app        = "carecare"
    env        = var.env
    managed_by = "terraform"
  }
}

# --- Networking -------------------------------------------------------------
resource "google_compute_network" "vpc" {
  name                    = "${local.name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "nodes" {
  name          = "${local.name}-nodes"
  network       = google_compute_network.vpc.id
  region        = var.region
  ip_cidr_range = "10.10.0.0/20"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.20.0.0/16"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.30.0.0/20"
  }
}

# --- GKE (regional, private nodes) -----------------------------------------
resource "google_container_cluster" "primary" {
  name     = local.name
  location = var.region

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.nodes.id

  # Regional control plane + node pools for HA.
  release_channel {
    channel = "REGULAR"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Managed so that node patching is not our problem.
  node_pool {
    name       = "default"
    node_count = 1 # single-node default pool; real capacity in the autoscaled pool
    node_config {
      machine_type = "e2-standard-2"
      labels       = local.labels
      oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    }
  }

  deletion_protection = false
}

resource "google_container_node_pool" "apps" {
  name     = "apps"
  cluster  = google_container_cluster.primary.id
  location = var.region

  autoscaling {
    min_node_count = 2
    max_node_count = 10
  }

  node_config {
    machine_type    = "e2-standard-4"
    labels          = local.labels
    service_account = google_service_account.nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}

resource "google_service_account" "nodes" {
  account_id   = "${local.name}-nodes"
  display_name = "GKE node service account"
}

# --- Cloud SQL (private IP only) -------------------------------------------
resource "google_sql_database_instance" "postgres" {
  name             = "${local.name}-pg"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-custom-2-7680"
    availability_type = "REGIONAL" # HA failover
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "carecare" {
  name     = "carecare"
  instance = google_sql_database_instance.postgres.name
}

# --- Memorystore (Redis) ----------------------------------------------------
resource "google_redis_instance" "cache" {
  name           = "${local.name}-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 2
  region         = var.region
  redis_version  = "REDIS_7_0"

  authorized_network = google_compute_network.vpc.id
  labels             = local.labels
}

# --- Object storage for audit exports --------------------------------------
resource "google_storage_bucket" "audit" {
  name                        = "${local.name}-audit"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  retention_policy {
    retention_period = 220752000 # ~7 years, a common healthcare retention floor
    is_locked        = false
  }

  lifecycle_rule {
    condition { age = 365 }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  labels = local.labels
}

output "gke_cluster_name" {
  value = google_container_cluster.primary.name
}

output "sql_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  value     = google_redis_instance.cache.host
  sensitive = true
}

output "audit_bucket" {
  value = google_storage_bucket.audit.name
}
