# Multi-Container Service

A containerized Todo REST API built with Node.js, Express, MongoDB, and Docker Compose. This project follows the [roadmap.sh Multi-Container Application project](https://roadmap.sh/projects/multi-container-service) and explores containerization, persistent storage, remote deployment, and CI/CD.

## Project Objectives

- Build a REST API for managing Todo items.
- Run the API and MongoDB in separate Docker containers using Docker Compose.
- Persist MongoDB data across API container replacements.
- Host the application on a remote cloud server.
- Automate testing and Docker image publishing with GitHub Actions.
- Deploy the published image to AWS EC2 using AWS Systems Manager.

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB, Mongoose
- **Containerization:** Docker, Docker Compose
- **CI/CD:** GitHub Actions
- **Container Registry:** Docker Hub
- **Cloud Server:** AWS EC2
- **Remote Management:** AWS Systems Manager Run Command

## Architecture

```text
Developer
   |
   v
GitHub Repository
   |
   v
GitHub Actions
   |
   +--> Run Tests
   |
   +--> Build Docker Image
   |
   +--> Push Image to Docker Hub
                  |
                  v
             Docker Hub
                  |
                  | Manual deployment
                  v
        AWS Systems Manager
                  |
                  v
               AWS EC2
                  |
          Docker Compose
                  |
          +-------+-------+
          |               |
          v               v
       Todo API         MongoDB
       Port 3000       Port 27017
          |               |
          |               v
          |          Named Volume
          |
          v
     Host Port 3002
```

**Deployment status:** GitHub Actions automates testing and Docker image publishing. Deployment to EC2 is currently triggered manually through AWS Systems Manager Run Command.

## API Endpoints

The Todo API supports the following operations:

| Method   | Endpoint     | Description           |
| -------- | ------------ | --------------------- |
| `GET`    | `/todos`     | Retrieve all todos    |
| `POST`   | `/todos`     | Create a new todo     |
| `GET`    | `/todos/:id` | Retrieve a todo by ID |
| `PUT`    | `/todos/:id` | Update a todo by ID   |
| `DELETE` | `/todos/:id` | Delete a todo by ID   |

The API uses MongoDB to store Todo items. These endpoints are intended for an unauthenticated API, as specified by the roadmap project.

## Getting Started

### Prerequisites

- Git
- Docker Engine or Docker Desktop
- Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/codewithun/multi-container-service.git
cd multi-container-service
```

### 2. Start the application

Run Docker Compose using the Compose configuration provided in the repository.

```bash
docker compose up -d --build
```

Check the containers:

```bash
docker compose ps
```

> The command assumes the repository's default Compose file is available in the current directory. If the file has a different name, specify it using `-f`.

### 3. Test the API

For the deployed AWS instance, the API is exposed on host port `3002` and listens on container port `3000`.

```bash
curl -i http://localhost:3002/todos
```

When testing locally, use the host port configured in the local Compose file.

## Docker Compose and Data Persistence

The application consists of two main services:

- **API:** handles Todo requests and communicates with MongoDB.
- **MongoDB:** stores Todo documents.

MongoDB data is stored in a named Docker volume mounted at `/data/db`. The deployed configuration uses the volume name `multi-container-service_mongo_data`.

This allows database records to remain available when the API container is replaced, as long as the database volume is retained.

### Verify persistence

1. Create a Todo using `POST /todos`.
2. Retrieve the Todo using `GET /todos`.
3. Recreate only the API container.
4. Retrieve the Todo again and confirm it still exists.

Avoid `docker compose down -v` when you want to preserve the database, because it can remove Compose-managed volumes.

## Docker Hub

The application image is published to Docker Hub:

**Repository:** [untarasaputra/multi-container-service](https://hub.docker.com/r/untarasaputra/multi-container-service)

Pull the latest image:

```bash
docker pull untarasaputra/multi-container-service:latest
```

The GitHub Actions workflow publishes:

- `latest` — the most recently published image tag.
- `<commit-sha>` — an image associated with a specific Git commit.

A commit-specific tag can be used to identify the image associated with a particular revision.

## CI/CD with GitHub Actions

The workflow is located at:

```text
.github/workflows/ci-cd.yml
```

The current pipeline performs the following steps:

1. Runs automated tests on pushes and pull requests targeting `main`.
2. Builds the Docker image on pushes to `main`.
3. Authenticates with Docker Hub using GitHub Actions secrets.
4. Publishes the image with `latest` and commit-SHA tags.

### Required GitHub Secrets

Configure the following repository secrets under **Settings → Secrets and variables → Actions**:

| Secret               | Description             |
| -------------------- | ----------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub username     |
| `DOCKERHUB_TOKEN`    | Docker Hub access token |

Do not commit tokens or credentials to the repository.

### Current deployment limitation

The current AWS account has an AWS Organizations service control policy that blocks the IAM OIDC setup required by the planned GitHub Actions deployment approach.

Consequently, GitHub Actions currently publishes the image, while the EC2 deployment is initiated separately through AWS Systems Manager Run Command. Full automatic deployment from GitHub Actions to EC2 has not yet been implemented.

## Remote Server Deployment

The application is deployed to an Ubuntu 24.04 AWS EC2 instance using Docker Compose.

| Component            | Configuration                   |
| -------------------- | ------------------------------- |
| API container        | `todo-api`                      |
| MongoDB container    | `todo-mongodb`                  |
| API host port        | `3002`                          |
| API container port   | `3000`                          |
| MongoDB image        | `mongo:7`                       |
| Deployment directory | `/opt/multi-container-service`  |
| Deployment mechanism | AWS Systems Manager Run Command |

The deployed API can be accessed at:

```text
http://<EC2-PUBLIC-IP>:3002/todos
```

Replace `<EC2-PUBLIC-IP>` with the current public IP address of the EC2 instance. Configure network access appropriately in the EC2 security group.

### Deploy a published image

After GitHub Actions successfully publishes a new image:

1. Open **AWS Systems Manager → Run Command**.
2. Select the `AWS-RunShellScript` document.
3. Target the EC2 instance.
4. Execute the commands below.

```bash
set -eu

cd /opt/multi-container-service

# Pull the latest API image
sudo docker compose -f compose.yaml pull api

# Recreate only the API service
sudo docker compose -f compose.yaml up -d --no-deps api

# Check running containers
sudo docker ps

# Test the API
curl -i http://localhost:3002/todos
```

The `--no-deps` option prevents Docker Compose from starting or recreating dependency services as part of this API deployment. The existing MongoDB container and its volume are not intentionally modified by these commands.

## Verification

The deployed application has been verified with the following checks:

- The Todo API returned HTTP `200` from `GET /todos`.
- The API container started successfully after being recreated.
- The MongoDB container remained healthy.
- The existing Todo record titled `Tes Persistensi AWS` remained available after API deployment.
- The separate `dockerized-service` container continued running on host port `3001`.

These checks demonstrate that the API deployment did not remove the existing MongoDB data.

## Roadmap Alignment

| Roadmap requirement                                  | Current status                                    |
| ---------------------------------------------------- | ------------------------------------------------- |
| Build a Node.js Todo API                             | Implemented                                       |
| Connect the API to MongoDB                           | Implemented                                       |
| Containerize the application                         | Implemented                                       |
| Run the API and database with Docker Compose         | Implemented                                       |
| Persist MongoDB data                                 | Implemented and verified                          |
| Set up a remote cloud server                         | Implemented on AWS EC2                            |
| Automate tests with GitHub Actions                   | Implemented                                       |
| Publish images to Docker Hub                         | Implemented                                       |
| Automatically deploy from CI/CD to the remote server | In progress; deployment is currently manual       |
| Provision infrastructure with Terraform              | Not yet documented as implemented                 |
| Configure the server with Ansible                    | Not yet documented as implemented                 |
| Set up an Nginx reverse proxy using Docker Compose   | Optional bonus; not yet documented as implemented |

## Future Improvements

- Automate deployment after a successful CI/CD pipeline.
- Use Terraform to provision cloud infrastructure.
- Use Ansible to configure the remote server.
- Add an Nginx reverse proxy managed through Docker Compose.
- Add a health-check endpoint and deployment verification.
- Implement image rollback and database backup procedures.
- Add container image vulnerability scanning.

## Reference

- [roadmap.sh — Multi-Container Application](https://roadmap.sh/projects/multi-container-service)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
