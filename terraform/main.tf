terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "terraform-login"
}

variable "aws_region" {
  description = "AWS region tempat EC2 berjalan"
  type        = string
  default     = "ap-southeast-2"
}

variable "instance_id" {
  description = "ID EC2 yang sudah ada"
  type        = string
}

variable "security_group_id" {
  description = "ID Security Group yang sudah ada"
  type        = string
}

data "aws_instance" "existing" {
  instance_id = var.instance_id
}

data "aws_security_group" "existing" {
  id = var.security_group_id
}

output "ec2_details" {
  description = "Informasi EC2 yang ditemukan"
  value = {
    id         = data.aws_instance.existing.id
    state      = data.aws_instance.existing.instance_state
    type       = data.aws_instance.existing.instance_type
    public_ip  = data.aws_instance.existing.public_ip
    private_ip = data.aws_instance.existing.private_ip
    subnet_id  = data.aws_instance.existing.subnet_id
  }
}

output "security_group_details" {
  description = "Informasi Security Group yang ditemukan"
  value = {
    id     = data.aws_security_group.existing.id
    name   = data.aws_security_group.existing.name
    vpc_id = data.aws_security_group.existing.vpc_id
  }
}

resource "aws_vpc_security_group_ingress_rule" "todo_api" {
  security_group_id = data.aws_security_group.existing.id

  description = "Todo API testing"
  ip_protocol = "tcp"
  from_port   = 3002
  to_port     = 3002
  cidr_ipv4   = "118.99.73.24/32"
}

