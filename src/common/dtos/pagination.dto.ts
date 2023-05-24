import { Type } from "class-transformer";
import { IsOptional, IsPositive, Min } from "class-validator";

export class PaginationDto{

    @IsOptional()
    @IsPositive()
    @Type(()=>Number)
    limit?:number;

    @IsOptional()
    @Min(0)
    @IsPositive()
    @Type(()=>Number) //enable InmplicitConversion
    offset?: number;
}