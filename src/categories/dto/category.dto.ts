import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  /** @example "Kitchen" */
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  /** Lowercase letters, numbers and dashes. @example "kitchen" */
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and dashes',
  })
  slug!: string;
}
