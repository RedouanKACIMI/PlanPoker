package net.redouan.planpoker;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.util.HtmlUtils;

@Controller
public class CasinoController {

    private final SimpMessagingTemplate messagingTemplate;
    private final Room room = new Room();


    @Autowired
    public CasinoController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/speak")
    @SendTo("/topic/casinos")
    public Answer talk(Question question,  MessageHeaders headers){

        String mssg = question.getMessage();
        String sessionId = (String) headers.get("simpSessionId");
        System.out.println(question.getMessage());


        if (mssg.startsWith("+")){
            String voterName = mssg.substring(1);
            Voter newVoter = room.getVoters().get(sessionId);
            newVoter.setName(voterName);
            return new Answer("+" + newVoter );
        }

        if (mssg.startsWith("=")){
            room.setRevealed(false);
            int vote = Integer.parseInt(mssg.substring(1));
            if (vote > 0) {
                room.getVoters().get(sessionId).setVote(vote);
                return new Answer("$" + HtmlUtils.htmlEscape(sessionId));
            }
            room.getVoters().get(sessionId).setVote(0);
            return new Answer("." + HtmlUtils.htmlEscape(sessionId));
        }

        if (question.getMessage().equals("*")){
            room.setRevealed(true);
            String catchup = "*"+room.catchingUp();
            return new Answer(catchup);
        }

        if (question.getMessage().equals("%")){
            room.setRevealed(false);
            room.reset();
            return new Answer("%");
        }

        if (question.getMessage().startsWith("?")){
            String catchup;
            System.out.println("revealed is"+ room.getRevealed());
            if (room.getRevealed())
                catchup = "*"+room.catchingUp();
            else
                catchup = "&"+room.catchingUp();
            messagingTemplate.convertAndSend("/queue/individual/" + sessionId, "{\"message\":\""+ catchup +"\"}");
            return null;
        }

        return new Answer("→, " +
                HtmlUtils.htmlEscape(question.getMessage()) +
                " :: " + sessionId);

    }


    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        // Connection ended
        // Perform necessary actions or logging here
        System.out.println("Connection ended: " + event.getSessionId());
        room.getVoters().remove(event.getSessionId());
        Answer message = new Answer("-" + event.getSessionId());
        messagingTemplate.convertAndSend("/topic/casinos", "{\"message\":\""+message.getMessage()+"\"}");
    }


    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        // Connection established
        // Perform necessary actions or logging here
        String sessionId = accessor.getSessionId();
        Voter voter = new Voter(sessionId, "", 0);
        room.getVoters().put(sessionId, voter);
        // Connection established
        // Perform necessary actions or logging here
        System.out.println("Connection established: " + sessionId);
        Answer message = new Answer("? ~#" + sessionId);
        messagingTemplate.convertAndSend("/topic/casinos", "{\"message\":\""+message.getMessage()+"\"}");

        Answer privateMessage = new Answer("&& ~#" + sessionId);
        messagingTemplate.convertAndSend("/queue/individual/" + sessionId, "{\"message\":\""+privateMessage.getMessage()+"\"}");

    }
}