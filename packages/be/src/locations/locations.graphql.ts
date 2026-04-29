import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LocationSuggestionDto {
  @Field()
  id!: number;

  @Field()
  name!: string;

  @Field(() => Float)
  latitude!: number;

  @Field(() => Float)
  longitude!: number;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  admin1?: string;
}

@ObjectType()
export class RankedActivityDto {
  @Field()
  activity!: string;

  @Field(() => Float)
  score!: number;

  @Field(() => Float)
  confidence!: number;

  @Field(() => [String])
  reasons!: string[];
}

@ObjectType()
export class RankedDayDto {
  @Field()
  date!: string;

  @Field(() => [RankedActivityDto])
  activities!: RankedActivityDto[];
}

@ObjectType()
export class RankedLocationDto {
  @Field()
  name!: string;

  @Field(() => Float)
  latitude!: number;

  @Field(() => Float)
  longitude!: number;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  admin1?: string;
}

@ObjectType()
export class RankedActivitiesResponseDto {
  @Field(() => RankedLocationDto)
  location!: RankedLocationDto;

  @Field(() => [RankedDayDto])
  days!: RankedDayDto[];
}

@InputType()
export class CoordinatesInput {
  @Field(() => Float)
  latitude!: number;

  @Field(() => Float)
  longitude!: number;
}

@InputType()
export class LocationNameInput {
  @Field()
  name!: string;
}
