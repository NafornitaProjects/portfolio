provider "kubernetes" {
  insecure = true
}

resource "kubernetes_namespace" "app" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_ingress_v1" "app_ingress" {
  metadata {
    name      = "${var.app_name}-ingress"
    namespace = var.namespace
    annotations = {
      "cert-manager.io/cluster-issuer"                   = "cloudflare-issuer"
      "traefik.ingress.kubernetes.io/router.entrypoints" = "websecure"
    }
  }

  spec {
    tls {
      hosts       = [var.domain]
      secret_name = "${var.app_name}-tls"
    }

    rule {
      host = var.domain
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "${var.app_name}-svc"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
