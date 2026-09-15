from pydantic import BaseModel, ConfigDict, Field, field_validator


class SemanticComparisonRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    text_a: str = Field(min_length=1)
    text_b: str = Field(min_length=1)

    @field_validator("text_a", "text_b")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value:
            raise ValueError("Text inputs must not be blank.")
        return value


class SemanticComparisonResponse(BaseModel):
    similarity: float = Field(ge=-1.0, le=1.0)
    model: str
