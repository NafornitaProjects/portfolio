provider "kubernetes" {
  insecure = true
}

resource "kubernetes_manifest" "ns" {
  manifest = {
    apiVersion = "v1"
    kind       = "Namespace"
    metadata = {
      name = var.namespace
    }
  }
  # if the namespace already exists, don’t error
  ignore_conflicts = true
}

resource "kubernetes_manifest" "ingress" {
  manifest = {
    apiVersion = "networking.k8s.io/v1"
    kind       = "Ingress"
    metadata = {
      name      = "${var.app_name}-ingress"
      namespace = var.namespace
      annotations = {
        "cert-manager.io/cluster-issuer"                   = "cloudflare-issuer"
        "traefik.ingress.kubernetes.io/router.entrypoints" = "websecure"
      }
    }
    spec = {
      ingressClassName = "traefik"
      tls = [{
        hosts      = [var.domain]
        secretName = "${var.app_name}-tls"
      }]
      rules = [{
        host = var.domain
        http = {
          paths = [{
            path     = "/"
            pathType = "Prefix"
            backend = {
              service = {
                name = "${var.app_name}-svc"
                port = { number = 80 }
              }
            }
          }]
        }
      }]
    }
  }
  ignore_conflicts = true
}
