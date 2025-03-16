import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BookApiConstruct } from './book-api-construct';

export class BookManagementApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use a custom Construct
    new BookApiConstruct(this, 'BookApi');
  }
}
