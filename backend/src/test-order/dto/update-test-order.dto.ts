/**
 * File: test-order/dto/update-test-order.dto.ts
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateTestOrderDto } from './create-test-order.dto';

export class UpdateTestOrderDto extends PartialType(CreateTestOrderDto) {}
