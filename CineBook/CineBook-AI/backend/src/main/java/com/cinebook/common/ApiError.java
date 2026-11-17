package com.cinebook.common;
import java.time.Instant; import java.util.List;
public record ApiError(String code,String message,String path,Instant timestamp,String correlationId,List<FieldIssue> errors){public record FieldIssue(String field,String message){}}
