pipeline {
    agent any

    environment {
        DEPLOYMENT_NAME = "teedy-deployment"
        CONTAINER_NAME = "teedy-app"
        IMAGE_NAME = "yanko7019/teedy:36"
    PATH = "/opt/homebrew/bin:/usr/local/bin:$PATH"

    }

    stages {
        stage('Start Minikube') {
            steps {
                sh '''
                echo "[INFO] Checking Minikube status..."
                if ! minikube status | grep -q "Running"; then
                    echo "[INFO] Minikube not running. Starting now..."
                    minikube start
                else
                    echo "[INFO] Minikube is already running."
                fi
                '''
            }
        }

        stage('Load Docker Image') {
            steps {
                sh '''
                echo "[INFO] Loading local Docker image into Minikube..."
                minikube image load ${IMAGE_NAME}
                '''
            }
        }

        stage('Deploy to K8s') {
            steps {
                sh '''
                echo "[INFO] Updating Kubernetes deployment with new image..."
                kubectl set image deployment/${DEPLOYMENT_NAME} ${CONTAINER_NAME}=${IMAGE_NAME} --record
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                echo "[INFO] Waiting for rollout to finish..."
                kubectl rollout status deployment/${DEPLOYMENT_NAME}

                echo "[INFO] Current pods:"
                kubectl get pods

                echo "[INFO] Exposing service (if not already exposed)..."
                kubectl expose deployment ${DEPLOYMENT_NAME} --type=LoadBalancer --port=8080 --target-port=8080 || true

                echo "[INFO] Minikube service info:"
                minikube service ${DEPLOYMENT_NAME} --url
                '''
            }
        }
    }

    post {
        success {
            echo "[SUCCESS] Teedy deployed to K8s!"
        }
        failure {
            echo "[FAILURE] Deployment failed."
        }
    }
}
