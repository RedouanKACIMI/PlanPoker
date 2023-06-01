package net.redouan.planpoker;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Room {
   private Map<String, Voter> voters = new HashMap();
   private Boolean revealed = false;

   public String catchingUp(){
      ArrayList votersList = new ArrayList();
      voters.forEach((sid, voter) -> {
         votersList.add(voter.toString());
      });
      return String.join("&&", votersList);
   }

   public void reset(){
      for (Voter voter : voters.values ()) {
         voter.setVote(0);
      }
   }
}
