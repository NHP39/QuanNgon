package ute.phuc.quanngon.exception;

public class EmailSendingException extends RuntimeException {
    public EmailSendingException(String message) {
        super(message);
    }

    // Logging: giữ nguyên nhân SMTP để handler ghi đầy đủ stack trace.
    public EmailSendingException(String message, Throwable cause) {
        super(message, cause);
    }
}
